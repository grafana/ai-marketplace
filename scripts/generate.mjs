#!/usr/bin/env node

// Generates each plugin's per-platform manifests, MCP configs and POWER.md
// frontmatter from its sources/<name>.json, plus the "plugins" list
// of every self-hosted marketplace index and a Kiro power under kiro/<name>/. Run with --check to fail instead of writing when
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
// It lives in its own folder so hosts that fall back to a root plugin.json
// don't pick up its minimal manifest instead of their own.
const KIRO_POWERS_DIR = "kiro";
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

// Servers with an explicit "http" type for remote ones, as Claude Code, Factory
// and Kiro's POWER.md loader expect. Claude Code also fills
// ${user_config.<key>} placeholders instead of reading environment variables.
function typedMcpServers(servers, userConfig = {}) {
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
    if (values.marketplace && !MARKETPLACES[platform]) {
      throw new Error(`${source.name}: platforms.${platform} has no marketplace index for "marketplace".`);
    }
    // Every platform must ship the same plugin under the same version.
    for (const field of ["name", "version"]) {
      if (field in values) {
        throw new Error(`${source.name}: platforms.${platform} can't override "${field}".`);
      }
    }
  }
  // Servers are declared once; each output adds its own transport field.
  for (const [name, server] of Object.entries(source.mcpServers ?? {})) {
    for (const field of ["type", "serverUrl", "httpUrl"]) {
      if (field in server) {
        throw new Error(`${source.name}: mcpServers.${name} can't set "${field}"; use "url" or "command".`);
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

  // Cursor finds the servers in mcp.json on its own.
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

  if (platforms.antigravity) {
    const antigravity = merge(base, overrides(source, "antigravity"));
    // Antigravity's marketplace listing rules.
    if (!(antigravity.description?.length >= 120 && antigravity.description.length <= 160)) {
      throw new Error(`${source.name}: the Antigravity description must be 120–160 characters.`);
    }
    if ((antigravity.suggestedPrompts?.length ?? 0) > 3) {
      throw new Error(`${source.name}: Antigravity allows at most 3 suggestedPrompts.`);
    }
    files[".antigravity-plugin/plugin.json"] = merge(
      { $schema: ANTIGRAVITY_SCHEMA },
      base,
      { logo: source.logo },
      overrides(source, "antigravity")
    );
  }

  if (source.mcpServers) {
    const servers = Object.entries(source.mcpServers);
    files[".mcp.json"] = { mcpServers: typedMcpServers(source.mcpServers, source.userConfig) };
    files["mcp.json"] = { mcpServers: typedMcpServers(source.mcpServers) };
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

// The Agent Plugins manifest and MCP config of a plugin's Kiro power.
function kiroPowerFiles(source) {
  const kiro = merge(pick(source, BASE_FIELDS), overrides(source, "kiro"));
  const files = { "plugin.json": { $schema: AGENT_PLUGINS_SCHEMA, ...pick(kiro, AGENT_PLUGINS_FIELDS) } };
  if (source.mcpServers) {
    files["mcp.json"] = {
      $schema: AGENT_PLUGINS_MCP_SCHEMA,
      mcpServers: Object.fromEntries(
        Object.entries(source.mcpServers).map(([name, server]) => [
          name,
          { type: server.url ? "streamable-http" : "stdio", ...server },
        ])
      ),
    };
  }
  return files;
}

// Repo-relative paths of every file under dir, or [] if it doesn't exist.
async function listFiles(dir) {
  const entries = await fs.readdir(path.join(repoRoot, dir), { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(repoRoot, path.join(entry.parentPath, entry.name)));
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

// Sources live outside the plugin directories so they aren't shipped with each plugin.
async function readSources(pluginsDir, sourcesDir) {
  const sources = [];
  const pluginNames = (await fs.readdir(pluginsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const file of await fs.readdir(sourcesDir)) {
    const name = file.replace(/\.json$/, "");
    if (!pluginNames.includes(name)) {
      throw new Error(`${path.join("sources", file)} has no plugins/${name}/ directory.`);
    }
  }

  for (const name of pluginNames) {
    const entry = { name };
    const sourcePath = path.join(sourcesDir, `${name}.json`);
    let source;
    try {
      source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
    } catch (error) {
      throw new Error(`Cannot read ${path.relative(repoRoot, sourcePath)}: ${error.message}`);
    }

    if (source.name !== entry.name) {
      throw new Error(`${path.relative(repoRoot, sourcePath)}: "name" must match the file name "${entry.name}".`);
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
  const sources = await readSources(pluginsDir, path.join(repoRoot, "sources"));
  // Repo-relative path -> expected content, or null for a file to remove.
  const outputs = new Map();
  const kiroOutputs = new Map();

  for (const source of sources) {
    const pluginDir = path.join("plugins", source.name);
    if (source.logo && !(await fs.stat(path.join(repoRoot, pluginDir, source.logo)).catch(() => null))) {
      throw new Error(`${source.name}: logo "${source.logo}" does not exist.`);
    }
    const files = generatedFiles(source);

    for (const relativePath of new Set([...GENERATED_PATHS, ...Object.keys(files)])) {
      outputs.set(path.join(pluginDir, relativePath), relativePath in files ? jsonText(files[relativePath]) : null);
    }

    if (source.platforms.kiro) {
      const powerPath = path.join(pluginDir, "POWER.md");
      outputs.set(powerPath, powerMd(source, await readText(path.join(repoRoot, powerPath)), powerPath));

      // The power copies the plugin's README and skills, since registry imports
      // only see the power's own folder.
      // ponytail: copies are read as UTF-8 text; binary skill assets would need Buffers.
      const powerDir = path.join(KIRO_POWERS_DIR, source.name);
      for (const [relativePath, content] of Object.entries(kiroPowerFiles(source))) {
        kiroOutputs.set(path.join(powerDir, relativePath), jsonText(content));
      }
      for (const file of [path.join(pluginDir, "README.md"), ...(await listFiles(path.join(pluginDir, "skills")))]) {
        const content = await readText(path.join(repoRoot, file));
        if (content !== null) {
          kiroOutputs.set(path.join(powerDir, path.relative(pluginDir, file)), content);
        }
      }
    }
  }

  // Remove files under kiro/ that no power generates any more.
  for (const file of await listFiles(KIRO_POWERS_DIR)) {
    outputs.set(file, null);
  }
  for (const [file, content] of kiroOutputs) {
    outputs.set(file, content);
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
    console.error("Generated files are out of date. Edit sources/<name>.json, then run `node scripts/generate.mjs`:");
    for (const file of stale) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }
}

await main();
