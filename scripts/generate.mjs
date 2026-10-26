#!/usr/bin/env node

// Generates each plugin's per-platform manifests and MCP configs from its
// plugins/<name>/plugin.src.json. Run with --check to fail instead of writing
// when a generated file is out of date (used in CI).

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const check = process.argv.includes("--check");

const PLATFORMS = ["claude", "cursor", "codex"];

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

// Returns { "<path relative to the plugin dir>": content } for every generated file.
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
      platforms.claude
    );
  }

  if (platforms.cursor) {
    files[".cursor-plugin/plugin.json"] = merge(base, { logo: source.logo }, platforms.cursor);
  }

  if (platforms.codex) {
    files[".codex-plugin/plugin.json"] = merge(base, { displayName: null }, platforms.codex, {
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

async function main() {
  const pluginsDir = path.join(repoRoot, "plugins");
  const stale = [];

  for (const entry of await fs.readdir(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const pluginDir = path.join(pluginsDir, entry.name);
    const sourcePath = path.join(pluginDir, "plugin.src.json");
    let source;
    try {
      source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
    } catch (error) {
      throw new Error(`Cannot read ${path.relative(repoRoot, sourcePath)}: ${error.message}`);
    }

    if (source.name !== entry.name) {
      throw new Error(`${path.relative(repoRoot, sourcePath)}: "name" must match the directory name "${entry.name}".`);
    }

    const files = generatedFiles(source);
    for (const relativePath of GENERATED_PATHS.filter((generatedPath) => !(generatedPath in files))) {
      const filePath = path.join(pluginDir, relativePath);
      if (!(await fs.stat(filePath).catch(() => null))) continue;

      const displayPath = path.relative(repoRoot, filePath);
      if (check) {
        stale.push(`${displayPath} (no longer generated)`);
        continue;
      }
      await fs.rm(filePath);
      console.log(`Removed ${displayPath}`);
    }

    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = path.join(pluginDir, relativePath);
      const displayPath = path.relative(repoRoot, filePath);
      const expected = `${JSON.stringify(content, null, 2)}\n`;
      const current = await fs.readFile(filePath, "utf8").catch(() => null);
      if (current === expected) continue;

      if (check) {
        stale.push(displayPath);
        continue;
      }
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, expected);
      console.log(`Wrote ${displayPath}`);
    }
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
