#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const FORMATS = ["cursor-plugin", "claude-plugin"];
const KIRO_FORMAT = "kiro-power";

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplaceNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath, context) {
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      addError(`${context} exists but is not a directory: ${targetPath}`);
      return false;
    }
    return true;
  } catch {
    addError(`${context} directory is missing: ${targetPath}`);
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON (${filePath}): ${error.message}`);
    return null;
  }
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

function parseFrontmatter(content) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) {
    return null;
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const fields = {};

  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }

  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return true;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractPathValues(entry));
  }

  if (value && typeof value === "object") {
    const candidates = [];
    if (typeof value.path === "string") {
      candidates.push(value.path);
    }
    if (typeof value.file === "string") {
      candidates.push(value.file);
    }
    return candidates;
  }

  return [];
}

async function validateReferencedPath(pluginDir, fieldName, pathValue, pluginName) {
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
    return;
  }

  if (!isSafeRelativePath(pathValue)) {
    addError(
      `${pluginName}: field "${fieldName}" has invalid path "${pathValue}". Use a relative path without ".." or absolute prefixes.`
    );
    return;
  }

  const resolved = path.resolve(pluginDir, pathValue);
  const exists = await pathExists(resolved);
  if (!exists) {
    addError(`${pluginName}: field "${fieldName}" references missing path "${pathValue}".`);
  }
}

async function validateFrontmatterFile(filePath, componentName, requiredKeys, pluginName) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const relativeFile = path.relative(repoRoot, filePath);

  if (!parsed) {
    addError(`${pluginName}: ${componentName} file missing YAML frontmatter: ${relativeFile}`);
    return;
  }

  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
      addError(`${pluginName}: ${componentName} file missing "${key}" in frontmatter: ${relativeFile}`);
    }
  }
}

async function validateComponentFrontmatter(pluginDir, pluginName) {
  const rulesDir = path.join(pluginDir, "rules");
  if (await pathExists(rulesDir)) {
    const files = await walkFiles(rulesDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(file, "rule", ["description"], pluginName);
      }
    }
  }

  const skillsDir = path.join(pluginDir, "skills");
  if (await pathExists(skillsDir)) {
    const files = await walkFiles(skillsDir);
    for (const file of files) {
      if (path.basename(file) === "SKILL.md") {
        await validateFrontmatterFile(file, "skill", ["name", "description"], pluginName);
      }
    }
  }

  const agentsDir = path.join(pluginDir, "agents");
  if (await pathExists(agentsDir)) {
    const files = await walkFiles(agentsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(file, "agent", ["name", "description"], pluginName);
      }
    }
  }

  const commandsDir = path.join(pluginDir, "commands");
  if (await pathExists(commandsDir)) {
    const files = await walkFiles(commandsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown" || ext === ".txt") {
        await validateFrontmatterFile(file, "command", ["name", "description"], pluginName);
      }
    }
  }
}

function resolveMarketplaceSource(source, pluginRoot) {
  if (typeof source !== "string" || source.length === 0) {
    return null;
  }
  const cleaned = source.replace(/^\.\//, "");
  if (!pluginRoot) {
    return cleaned;
  }
  const normalizedRoot = pluginRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedSource = cleaned.replace(/\\/g, "/");
  if (normalizedSource === normalizedRoot || normalizedSource.startsWith(`${normalizedRoot}/`)) {
    return normalizedSource;
  }
  return `${normalizedRoot}/${normalizedSource}`;
}

async function validateFormat(format) {
  const marketplacePath = path.join(repoRoot, `.${format}`, "marketplace.json");
  const marketplace = await readJsonFile(marketplacePath, `[${format}] Marketplace manifest`);
  if (!marketplace) {
    return null;
  }

  if (typeof marketplace.name !== "string" || !marketplaceNamePattern.test(marketplace.name)) {
    addError(
      `[${format}] Marketplace "name" must be lowercase kebab-case and start/end with an alphanumeric character.`
    );
  }

  if (!marketplace.owner || typeof marketplace.owner.name !== "string" || marketplace.owner.name.length === 0) {
    addError(`[${format}] Marketplace "owner.name" is required.`);
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError(`[${format}] Marketplace "plugins" must be a non-empty array.`);
    return marketplace;
  }

  const pluginRoot = marketplace.metadata?.pluginRoot;
  if (pluginRoot !== undefined) {
    if (typeof pluginRoot !== "string" || !isSafeRelativePath(pluginRoot)) {
      addError(`[${format}] Marketplace "metadata.pluginRoot" must be a safe relative path.`);
    } else {
      const pluginRootAbs = path.join(repoRoot, pluginRoot);
      await ensureDirectory(pluginRootAbs, `[${format}] Marketplace "metadata.pluginRoot"`);
    }
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `[${format}] plugins[${index}]`;

    if (!entry || typeof entry !== "object") {
      addError(`${label} must be an object.`);
      continue;
    }

    if (typeof entry.name !== "string" || !pluginNamePattern.test(entry.name)) {
      addError(`${label}.name must be lowercase and use only alphanumerics, hyphens, and periods.`);
      continue;
    }

    if (seenNames.has(entry.name)) {
      addError(`[${format}] Duplicate plugin name in marketplace manifest: "${entry.name}"`);
    }
    seenNames.add(entry.name);

    const sourcePath = resolveMarketplaceSource(entry.source, pluginRoot ?? "");
    if (!sourcePath) {
      addError(`${label}.source must be a string path.`);
      continue;
    }
    if (!isSafeRelativePath(sourcePath)) {
      addError(`${label}.source is not a safe relative path: "${sourcePath}"`);
      continue;
    }

    const pluginDir = path.join(repoRoot, sourcePath);
    const pluginDirExists = await ensureDirectory(pluginDir, `${label}.source`);
    if (!pluginDirExists) {
      continue;
    }

    const manifestPath = path.join(pluginDir, `.${format}`, "plugin.json");
    const pluginManifest = await readJsonFile(manifestPath, `[${format}] ${entry.name} plugin manifest`);
    if (!pluginManifest) {
      continue;
    }

    if (typeof pluginManifest.name !== "string" || !pluginNamePattern.test(pluginManifest.name)) {
      addError(
        `[${format}] ${entry.name}: "name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.`
      );
    }

    if (pluginManifest.name && pluginManifest.name !== entry.name) {
      addError(
        `[${format}] ${entry.name}: marketplace entry name does not match plugin.json name ("${pluginManifest.name}").`
      );
    }

    const manifestFields = ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"];
    for (const field of manifestFields) {
      const values = extractPathValues(pluginManifest[field]);
      for (const value of values) {
        await validateReferencedPath(pluginDir, field, value, `[${format}] ${entry.name}`);
      }
    }

    await validateComponentFrontmatter(pluginDir, `[${format}] ${entry.name}`);

    const hooksPath = path.join(pluginDir, "hooks", "hooks.json");
    if (!(await pathExists(hooksPath))) {
      addWarning(`[${format}] ${entry.name}: no hooks/hooks.json file found (only needed when using hooks).`);
    }

    const mcpPath = path.join(pluginDir, "mcp.json");
    if (!(await pathExists(mcpPath))) {
      addWarning(`[${format}] ${entry.name}: no mcp.json file found (only needed when using MCP servers).`);
    }
  }

  return marketplace;
}

function validateDualFormatConsistency(cursorMarketplace, claudeMarketplace) {
  if (!cursorMarketplace || !claudeMarketplace) {
    return;
  }

  const cursorVersion = cursorMarketplace.metadata?.version;
  const claudeVersion = claudeMarketplace.metadata?.version;
  if (cursorVersion && claudeVersion && cursorVersion !== claudeVersion) {
    addError(
      `Marketplace versions don't match (cursor-plugin: ${cursorVersion}, claude-plugin: ${claudeVersion}).`
    );
  }

  const cursorNames = new Set((cursorMarketplace.plugins ?? []).map((p) => p.name));
  const claudeNames = new Set((claudeMarketplace.plugins ?? []).map((p) => p.name));

  for (const name of cursorNames) {
    if (!claudeNames.has(name)) {
      addWarning(`Plugin "${name}" exists in cursor-plugin marketplace but not in claude-plugin.`);
    }
  }
  for (const name of claudeNames) {
    if (!cursorNames.has(name)) {
      addWarning(`Plugin "${name}" exists in claude-plugin marketplace but not in cursor-plugin.`);
    }
  }
}

async function validatePluginVersionConsistency() {
  const pluginsDir = path.join(repoRoot, "plugins");
  if (!(await pathExists(pluginsDir))) {
    return;
  }

  const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginDir = path.join(pluginsDir, entry.name);
    const cursorManifestPath = path.join(pluginDir, ".cursor-plugin", "plugin.json");
    const claudeManifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");

    const hasCursor = await pathExists(cursorManifestPath);
    const hasClaude = await pathExists(claudeManifestPath);

    if (hasCursor && hasClaude) {
      const cursorManifest = await readJsonFile(cursorManifestPath, `${entry.name} cursor plugin.json`);
      const claudeManifest = await readJsonFile(claudeManifestPath, `${entry.name} claude plugin.json`);

      if (cursorManifest && claudeManifest) {
        if (cursorManifest.version !== claudeManifest.version) {
          addError(
            `Plugin "${entry.name}" versions don't match (cursor-plugin: ${cursorManifest.version}, claude-plugin: ${claudeManifest.version}).`
          );
        }
      }
    }
  }
}

async function readPowerMdFrontmatter(filePath, context) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  const parsed = parseFrontmatter(content);
  if (!parsed) {
    addError(`${context} missing YAML frontmatter: ${filePath}`);
    return null;
  }

  return parsed;
}

async function validateKiroFormat() {
  const marketplacePath = path.join(repoRoot, `.${KIRO_FORMAT}`, "marketplace.json");
  const marketplace = await readJsonFile(marketplacePath, `[${KIRO_FORMAT}] Marketplace manifest`);
  if (!marketplace) {
    return null;
  }

  if (typeof marketplace.name !== "string" || !marketplaceNamePattern.test(marketplace.name)) {
    addError(
      `[${KIRO_FORMAT}] Marketplace "name" must be lowercase kebab-case and start/end with an alphanumeric character.`
    );
  }

  if (!marketplace.owner || typeof marketplace.owner.name !== "string" || marketplace.owner.name.length === 0) {
    addError(`[${KIRO_FORMAT}] Marketplace "owner.name" is required.`);
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError(`[${KIRO_FORMAT}] Marketplace "plugins" must be a non-empty array.`);
    return marketplace;
  }

  const pluginRoot = marketplace.metadata?.pluginRoot;
  if (pluginRoot !== undefined) {
    if (typeof pluginRoot !== "string" || !isSafeRelativePath(pluginRoot)) {
      addError(`[${KIRO_FORMAT}] Marketplace "metadata.pluginRoot" must be a safe relative path.`);
    } else {
      const pluginRootAbs = path.join(repoRoot, pluginRoot);
      await ensureDirectory(pluginRootAbs, `[${KIRO_FORMAT}] Marketplace "metadata.pluginRoot"`);
    }
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `[${KIRO_FORMAT}] plugins[${index}]`;

    if (!entry || typeof entry !== "object") {
      addError(`${label} must be an object.`);
      continue;
    }

    if (typeof entry.name !== "string" || !pluginNamePattern.test(entry.name)) {
      addError(`${label}.name must be lowercase and use only alphanumerics, hyphens, and periods.`);
      continue;
    }

    if (seenNames.has(entry.name)) {
      addError(`[${KIRO_FORMAT}] Duplicate plugin name in marketplace manifest: "${entry.name}"`);
    }
    seenNames.add(entry.name);

    const sourcePath = resolveMarketplaceSource(entry.source, pluginRoot ?? "");
    if (!sourcePath) {
      addError(`${label}.source must be a string path.`);
      continue;
    }
    if (!isSafeRelativePath(sourcePath)) {
      addError(`${label}.source is not a safe relative path: "${sourcePath}"`);
      continue;
    }

    const pluginDir = path.join(repoRoot, sourcePath);
    const pluginDirExists = await ensureDirectory(pluginDir, `${label}.source`);
    if (!pluginDirExists) {
      continue;
    }

    // Kiro powers use POWER.md frontmatter instead of plugin.json
    const powerMdPath = path.join(pluginDir, "POWER.md");
    const frontmatter = await readPowerMdFrontmatter(powerMdPath, `[${KIRO_FORMAT}] ${entry.name} POWER.md`);
    if (!frontmatter) {
      continue;
    }

    for (const key of ["name", "displayName", "description", "keywords"]) {
      if (!frontmatter[key] || frontmatter[key].length === 0) {
        addError(`[${KIRO_FORMAT}] ${entry.name}: POWER.md frontmatter missing required field "${key}".`);
      }
    }

    const powerName = frontmatter.name?.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (powerName && powerName !== entry.name) {
      addError(
        `[${KIRO_FORMAT}] ${entry.name}: marketplace entry name does not match POWER.md name ("${powerName}").`
      );
    }

    // Validate steering directory files if present
    const steeringDir = path.join(pluginDir, "steering");
    if (await pathExists(steeringDir)) {
      const stat = await fs.stat(steeringDir);
      if (!stat.isDirectory()) {
        addError(`[${KIRO_FORMAT}] ${entry.name}: "steering" exists but is not a directory.`);
      }
    }

    // mcp.json is optional for Kiro powers
    const mcpPath = path.join(pluginDir, "mcp.json");
    if (!(await pathExists(mcpPath))) {
      addWarning(`[${KIRO_FORMAT}] ${entry.name}: no mcp.json file found (only needed when using MCP servers).`);
    }
  }

  return marketplace;
}

function validateTripleFormatConsistency(cursorMarketplace, claudeMarketplace, kiroMarketplace) {
  if (!kiroMarketplace) {
    return;
  }

  const kiroNames = new Set((kiroMarketplace.plugins ?? []).map((p) => p.name));

  if (cursorMarketplace) {
    const cursorNames = new Set((cursorMarketplace.plugins ?? []).map((p) => p.name));
    for (const name of kiroNames) {
      if (!cursorNames.has(name)) {
        addError(`Plugin "${name}" exists in kiro-power marketplace but not in cursor-plugin.`);
      }
    }
    for (const name of cursorNames) {
      if (!kiroNames.has(name)) {
        addError(`Plugin "${name}" exists in cursor-plugin marketplace but not in kiro-power.`);
      }
    }
  }

  if (claudeMarketplace) {
    const claudeNames = new Set((claudeMarketplace.plugins ?? []).map((p) => p.name));
    for (const name of kiroNames) {
      if (!claudeNames.has(name)) {
        addError(`Plugin "${name}" exists in kiro-power marketplace but not in claude-plugin.`);
      }
    }
  }
}

async function main() {
  const results = {};
  for (const format of FORMATS) {
    results[format] = await validateFormat(format);
  }

  validateDualFormatConsistency(results["cursor-plugin"], results["claude-plugin"]);
  await validatePluginVersionConsistency();

  const kiroMarketplace = await validateKiroFormat();
  validateTripleFormatConsistency(results["cursor-plugin"], results["claude-plugin"], kiroMarketplace);

  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Validation passed (cursor-plugin + claude-plugin + kiro-power).");
}

await main();
