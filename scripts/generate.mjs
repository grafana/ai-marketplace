#!/usr/bin/env node

// Generates each plugin's per-platform manifests, MCP configs and POWER.md
// frontmatter from its plugins/<name>/plugin.src.json, plus the "plugins" list
// of every self-hosted marketplace index. Run with --check to fail instead of writing when
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
// Antigravity only lists plugins from its curated marketplace, so it has no index here.
const PLATFORMS = [...Object.keys(MARKETPLACES), "antigravity"];

const POWER_FIELDS = ["name", "displayName", "description", "keywords"];

// Agent Plugins (https://agent-plugins.org), the format Kiro's powers registry requires.
const AGENT_PLUGINS_FIELDS = ["name", "version", "description", "author", "homepage", "repository", "license", "keywords"];
const AGENT_PLUGINS_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const AGENT_PLUGINS_MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const ANTIGRAVITY_SCHEMA = "https://antigravity.google/schemas/v1/plugin.json";

// Every path generatedFiles() can produce, so files a source no longer
// declares can be found and removed.
const GENERATED_PATHS = [
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".antigravity-plugin/plugin.json",
  "plugin.json",
  ".mcp.json",
  "mcp.json",
  "mcp_config.json",
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

const SOURCE_FIELDS = [...BASE_FIELDS, "logo", "mcpServers", "userConfig", "platforms"];

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
// Its null values are kept so the final merge can remove the shared field.
function overrides(source, platform) {
  const { marketplace, ...rest } = source.platforms[platform] ?? {};
  return rest;
}

// Returns { "<path relative to the plugin dir>": content } for every generated JSON file.
function generatedFiles(source) {
  const platforms = source.platforms ?? {};
  const base = pick(source, BASE_FIELDS);
  const files = {};

  for (const field of Object.keys(source)) {
    if (!SOURCE_FIELDS.includes(field)) {
      throw new Error(`${source.name}: unknown field "${field}" (put platform-specific fields under "platforms").`);
    }
  }
  for (const [platform, values] of Object.entries(platforms)) {
    if (!PLATFORMS.includes(platform)) {
      throw new Error(`${source.name}: unknown platform "${platform}" (expected one of ${PLATFORMS.join(", ")}).`);
    }
    // Every platform must ship the same plugin under the same version.
    for (const field of ["name", "version"]) {
      if (field in values) {
        throw new Error(`${source.name}: platforms.${platform} can't override "${field}".`);
      }
    }
  }
  // Codex reads .mcp.json, whose ${user_config.*} placeholders only Claude Code
  // fills. Antigravity would need its own "variables" prompt, which isn't generated.
  for (const platform of ["codex", "antigravity"]) {
    if (platforms[platform] && source.userConfig) {
      throw new Error(`${source.name}: "userConfig" can't be combined with the ${platform} platform.`);
    }
  }

  if (platforms.claude) {
    files[".claude-plugin/plugin.json"] = merge(
      base,
      { userConfig: claudeUserConfig(source.userConfig) },
      overrides(source, "claude")
    );
  }

  // Inline servers keep Cursor off mcp.json, which is in the Agent Plugins format.
  if (platforms.cursor) {
    files[".cursor-plugin/plugin.json"] = merge(
      base,
      { logo: source.logo, mcpServers: source.mcpServers },
      overrides(source, "cursor")
    );
  }

  if (platforms.codex) {
    files[".codex-plugin/plugin.json"] = merge(base, { displayName: null }, overrides(source, "codex"), {
      interface: merge(
        { displayName: source.displayName, logo: source.logo && `./${source.logo}` },
        platforms.codex.interface
      ),
    });
  }

  if (platforms.kiro) {
    const kiro = merge(base, overrides(source, "kiro"));
    files["plugin.json"] = { $schema: AGENT_PLUGINS_SCHEMA, ...pick(kiro, AGENT_PLUGINS_FIELDS) };
  }

  if (platforms.antigravity) {
    files[".antigravity-plugin/plugin.json"] = merge(
      { $schema: ANTIGRAVITY_SCHEMA },
      base,
      { logo: source.logo },
      overrides(source, "antigravity")
    );
  }

  if (source.mcpServers) {
    const servers = Object.entries(source.mcpServers);
    files[".mcp.json"] = { mcpServers: claudeMcpServers(source.mcpServers, source.userConfig) };
    files["mcp.json"] = {
      $schema: AGENT_PLUGINS_MCP_SCHEMA,
      mcpServers: Object.fromEntries(
        servers.map(([name, server]) => [name, { type: server.url ? "streamable-http" : "stdio", ...server }])
      ),
    };
    if (platforms.antigravity) {
      files["mcp_config.json"] = {
        mcpServers: Object.fromEntries(
          servers.map(([name, { url, ...server }]) => [name, url ? { serverUrl: url, ...server } : server])
        ),
      };
    }
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

// File contents, or null if it doesn't exist. Other read errors are thrown.
async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
const jsonText = (content) => `${JSON.stringify(content, null, 2)}\n`;

async function main() {
  const pluginsDir = path.join(repoRoot, "plugins");
  const sources = await readSources(pluginsDir);
  // Repo-relative path -> expected content, or null for a file to remove.
  const outputs = new Map();

  for (const source of sources) {
    const pluginDir = path.join("plugins", source.name);
    if (source.logo && (await readText(path.join(repoRoot, pluginDir, source.logo))) === null) {
      throw new Error(`${source.name}: logo "${source.logo}" does not exist.`);
    }
    const files = generatedFiles(source);

    for (const relativePath of new Set([...GENERATED_PATHS, ...Object.keys(files)])) {
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
