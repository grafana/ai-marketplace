#!/usr/bin/env node

// Generates each plugin's per-platform manifests, MCP configs and POWER.md
// frontmatter from its plugins/<name>/plugin.src.json, plus the "plugins" list
// of every marketplace index. Run with --check to fail instead of writing when
// a generated file is out of date (used in CI).

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const check = process.argv.includes("--check");

// Each platform's marketplace index and how one plugin is listed in it. Only
// the "plugins" list is generated; the rest of the file is hand-written.
const MARKETPLACES = {
  claude: {
    path: ".claude-plugin/marketplace.json",
    entry: (name, description) => ({ name, source: `./plugins/${name}`, description }),
  },
  cursor: {
    path: ".cursor-plugin/marketplace.json",
    entry: (name, description) => ({ name, source: name, description }),
  },
  kiro: {
    path: ".kiro-power/marketplace.json",
    entry: (name, description) => ({ name, source: `plugins/${name}`, description }),
  },
  grok: {
    path: ".grok-plugin/marketplace.json",
    entry: (name, description) => ({ name, description, source: { type: "local", path: `./plugins/${name}` } }),
  },
  codex: {
    path: ".agents/plugins/marketplace.json",
    entry: (name) => ({ name, source: { source: "local", path: `./plugins/${name}` } }),
  },
};
const PLATFORMS = Object.keys(MARKETPLACES);

const POWER_FIELDS = ["name", "displayName", "description", "keywords"];

// Every path generatedFiles() can produce, so files a source no longer
// declares can be found and removed.
const GENERATED_PATHS = [
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "mcp.json",
];

const BASE_FIELDS = [
  "name",
  "displayName",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
];

function pick(source, keys) {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

// Shallow merge, left to right. A null value removes the field.
function merge(...objects) {
  const result = {};
  for (const object of objects) {
    for (const [key, value] of Object.entries(object ?? {})) {
      if (value === null) {
        delete result[key];
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// Claude Code's userConfig, without the generator-only "env" field.
function claudeUserConfig(userConfig) {
  if (!userConfig) {
    return undefined;
  }
  return Object.fromEntries(Object.entries(userConfig).map(([key, { env, ...option }]) => [key, option]));
}

// Claude Code needs an explicit "http" type for remote servers, and fills
// ${user_config.<key>} placeholders instead of reading environment variables.
function claudeMcpServers(servers, userConfig = {}) {
  const placeholders = Object.fromEntries(
    Object.entries(userConfig).map(([key, option]) => [`\${${option.env}}`, `\${user_config.${key}}`])
  );

  return Object.fromEntries(
    Object.entries(servers).map(([name, server]) => {
      if (server.url) {
        return [name, { type: "http", ...server }];
      }
      const env =
        server.env &&
        Object.fromEntries(Object.entries(server.env).map(([key, value]) => [key, placeholders[value] ?? value]));
      return [name, merge(server, { env })];
    })
  );
}

// A platform's overrides for its own files; "marketplace" only affects the index entry.
function overrides(source, platform) {
  return merge(source.platforms[platform], { marketplace: null });
}

// Returns { "<path relative to the plugin dir>": content } for every generated JSON file.
function generatedFiles(source) {
  const platforms = source.platforms ?? {};
  const base = pick(source, BASE_FIELDS);
  const files = {};

  for (const platform of Object.keys(platforms)) {
    if (!PLATFORMS.includes(platform)) {
      throw new Error(`${source.name}: unknown platform "${platform}" (expected one of ${PLATFORMS.join(", ")}).`);
    }
  }
  // .mcp.json uses Claude-only ${user_config.*} placeholders, which Codex can't fill.
  if (platforms.codex && source.userConfig) {
    throw new Error(`${source.name}: "userConfig" can't be combined with the codex platform.`);
  }

  if (platforms.claude) {
    files[".claude-plugin/plugin.json"] = merge(
      base,
      { userConfig: claudeUserConfig(source.userConfig) },
      overrides(source, "claude")
    );
  }

  if (platforms.cursor) {
    files[".cursor-plugin/plugin.json"] = merge(base, { logo: source.logo }, overrides(source, "cursor"));
  }

  if (platforms.codex) {
    files[".codex-plugin/plugin.json"] = merge(base, { displayName: null }, overrides(source, "codex"), {
      interface: merge(
        { displayName: source.displayName, logo: source.logo && `./${source.logo}` },
        platforms.codex.interface
      ),
    });
  }

  if (source.mcpServers) {
    files[".mcp.json"] = { mcpServers: claudeMcpServers(source.mcpServers, source.userConfig) };
    files["mcp.json"] = { mcpServers: source.mcpServers };
  }

  return files;
}

// POWER.md with its frontmatter regenerated and its hand-written body kept.
function powerMd(source, current, displayPath) {
  const match = current?.match(/^---\n(?:[\s\S]*?\n)?---\n/);
  if (!match) {
    throw new Error(`${displayPath} must exist and start with a frontmatter block.`);
  }

  const fields = merge(pick(source, POWER_FIELDS), overrides(source, "kiro"));
  const lines = POWER_FIELDS.filter((key) => fields[key] !== undefined).map((key) => {
    const value = fields[key];
    return `${key}: ${Array.isArray(value) ? `[${value.map((item) => JSON.stringify(item)).join(", ")}]` : JSON.stringify(value)}`;
  });
  return `---\n${lines.join("\n")}\n---\n${current.slice(match[0].length)}`;
}

async function readSources(pluginsDir) {
  const sources = [];
  for (const entry of await fs.readdir(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const sourcePath = path.join(pluginsDir, entry.name, "plugin.src.json");
    let source;
    try {
      source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
    } catch (error) {
      throw new Error(`Cannot read ${path.relative(repoRoot, sourcePath)}: ${error.message}`);
    }

    if (source.name !== entry.name) {
      throw new Error(`${path.relative(repoRoot, sourcePath)}: "name" must match the directory name "${entry.name}".`);
    }
    source.platforms ??= {};
    sources.push(source);
  }
  return sources.sort((a, b) => a.name.localeCompare(b.name));
}

const readText = (filePath) => fs.readFile(filePath, "utf8").catch(() => null);
const jsonText = (content) => `${JSON.stringify(content, null, 2)}\n`;

async function main() {
  const pluginsDir = path.join(repoRoot, "plugins");
  const sources = await readSources(pluginsDir);
  // Repo-relative path -> expected content, or null for a file to remove.
  const outputs = new Map();

  for (const source of sources) {
    const pluginDir = path.join("plugins", source.name);
    const files = generatedFiles(source);

    for (const relativePath of GENERATED_PATHS) {
      outputs.set(path.join(pluginDir, relativePath), relativePath in files ? jsonText(files[relativePath]) : null);
    }

    if (source.platforms.kiro) {
      const powerPath = path.join(pluginDir, "POWER.md");
      outputs.set(powerPath, powerMd(source, await readText(path.join(repoRoot, powerPath)), powerPath));
    }
  }

  for (const [platform, marketplace] of Object.entries(MARKETPLACES)) {
    const current = await readText(path.join(repoRoot, marketplace.path));
    if (current === null) {
      throw new Error(`${marketplace.path} is missing; create it with the marketplace's top-level fields.`);
    }

    const plugins = sources
      .filter((source) => source.platforms[platform])
      .map((source) => {
        const description = source.platforms[platform].description ?? source.description;
        return merge(marketplace.entry(source.name, description), source.platforms[platform].marketplace);
      });
    outputs.set(marketplace.path, jsonText({ ...JSON.parse(current), plugins }));
  }

  const stale = [];
  for (const [displayPath, expected] of outputs) {
    const filePath = path.join(repoRoot, displayPath);
    const current = await readText(filePath);
    if (current === expected) continue;

    if (check) {
      stale.push(expected === null ? `${displayPath} (no longer generated)` : displayPath);
      continue;
    }
    if (expected === null) {
      await fs.rm(filePath);
      console.log(`Removed ${displayPath}`);
      continue;
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, expected);
    console.log(`Wrote ${displayPath}`);
  }

  if (stale.length > 0) {
    console.error("Generated files are out of date. Edit plugin.src.json, then run `node scripts/generate.mjs`:");
    for (const file of stale) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }
}

await main();
