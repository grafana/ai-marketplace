#!/usr/bin/env node
/**
 * Launcher for the official `mcp-grafana` binary.
 *
 * MCPB manifests can only vary the server command by OS, not by CPU
 * architecture (modelcontextprotocol/mcpb#10), so a bundle that names a
 * single darwin binary breaks every Intel Mac with "Bad CPU type in
 * executable" (grafana/mcp-grafana#1070). This script is the workaround the
 * upstream issue converged on: detect platform *and* arch at launch time,
 * download the matching release binary, verify its checksum, cache it, and
 * exec it in stdio mode.
 *
 * Everything this script logs goes to stderr — stdout belongs to the MCP
 * stdio transport.
 *
 * Environment overrides:
 *   MCP_GRAFANA_BINARY   absolute path to an existing binary; skips download
 *   MCP_GRAFANA_VERSION  release tag to install (e.g. v1.1.0); skips the
 *                        "latest release" lookup
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";

const REPO = "grafana/mcp-grafana";

const ARCH_NAMES = { x64: "x86_64", arm64: "arm64", ia32: "i386" };
const OS_NAMES = { darwin: "Darwin", linux: "Linux", win32: "Windows" };

const arch = ARCH_NAMES[process.arch];
if (!arch) {
  fail(`Unsupported CPU architecture: ${process.arch}`);
}
const os = OS_NAMES[process.platform];
if (!os) {
  fail(`Unsupported platform: ${process.platform}`);
}

const isWindows = process.platform === "win32";
const binaryName = isWindows ? "mcp-grafana.exe" : "mcp-grafana";
const archiveExt = isWindows ? "zip" : "tar.gz";

function fail(message) {
  console.error(`mcp-grafana launcher: ${message}`);
  process.exit(1);
}

function log(message) {
  console.error(`mcp-grafana launcher: ${message}`);
}

/** Per-user cache, so a read-only or auto-updated plugin directory is fine. */
function cacheRoot() {
  if (isWindows) {
    return path.join(process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local"), "grafana-mcp");
  }
  return path.join(process.env.XDG_CACHE_HOME || path.join(homedir(), ".cache"), "grafana-mcp");
}

async function fetchOk(url, description) {
  const headers = {};
  // Avoids anonymous rate limits in CI; not required for normal use.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${description} failed: ${response.status} ${response.statusText}`);
  }
  return response;
}

async function latestVersion() {
  const response = await fetchOk(`https://api.github.com/repos/${REPO}/releases/latest`, "Release lookup");
  const { tag_name: tag } = await response.json();
  if (!tag) {
    throw new Error("Release lookup returned no tag_name");
  }
  return tag;
}

async function download(url, destination, description) {
  const response = await fetchOk(url, description);
  await pipeline(response.body, createWriteStream(destination));
}

async function verifyChecksum(archivePath, version, archiveName) {
  const response = await fetchOk(
    `https://github.com/${REPO}/releases/download/${version}/mcp-grafana_${version.replace(/^v/, "")}_checksums.txt`,
    "Checksum download"
  );
  const checksums = await response.text();
  const line = checksums.split("\n").find((l) => l.trim().endsWith(archiveName));
  if (!line) {
    throw new Error(`No checksum published for ${archiveName}`);
  }
  const expected = line.trim().split(/\s+/)[0];
  const actual = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${archiveName} (expected ${expected}, got ${actual})`);
  }
}

function extract(archivePath, destination) {
  const [command, args] = isWindows
    ? [
        "powershell",
        ["-NoProfile", "-Command", `Expand-Archive -Path "${archivePath}" -DestinationPath "${destination}" -Force`],
      ]
    : ["tar", ["-xzf", archivePath, "-C", destination]];

  return new Promise((resolve, reject) => {
    // Piped, not inherited: tar/powershell must never write to our stdout.
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`))
    );
  });
}

async function install(version, targetPath) {
  const archiveName = `mcp-grafana_${os}_${arch}.${archiveExt}`;
  const stagingDir = path.join(tmpdir(), `mcp-grafana-${version}-${process.pid}`);
  mkdirSync(stagingDir, { recursive: true });

  try {
    log(`downloading ${archiveName} (${version})`);
    const archivePath = path.join(stagingDir, archiveName);
    await download(
      `https://github.com/${REPO}/releases/download/${version}/${archiveName}`,
      archivePath,
      "Binary download"
    );
    await verifyChecksum(archivePath, version, archiveName);
    await extract(archivePath, stagingDir);

    const extracted = path.join(stagingDir, binaryName);
    if (!existsSync(extracted)) {
      throw new Error(`${binaryName} not found in ${archiveName}`);
    }
    if (!isWindows) {
      chmodSync(extracted, 0o755);
    }

    mkdirSync(path.dirname(targetPath), { recursive: true });
    // Rename into place so a concurrent launch never sees a partial binary.
    renameSync(extracted, targetPath);
    log(`installed ${version} to ${targetPath}`);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

function exec(binaryPath) {
  const child = spawn(binaryPath, process.argv.slice(2), { stdio: "inherit" });
  child.on("error", (error) => fail(`failed to start ${binaryPath}: ${error.message}`));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

async function main() {
  if (process.env.MCP_GRAFANA_BINARY) {
    exec(process.env.MCP_GRAFANA_BINARY);
    return;
  }

  const binDir = path.join(cacheRoot(), "bin");
  const pinned = process.env.MCP_GRAFANA_VERSION;

  let version = pinned;
  if (!version) {
    try {
      version = await latestVersion();
    } catch (error) {
      // Offline or rate-limited: any cached build beats no server at all.
      const cached = newestCachedVersion(binDir);
      if (!cached) {
        fail(`${error.message}. Set MCP_GRAFANA_VERSION to install a specific release.`);
      }
      log(`${error.message}; falling back to cached ${cached}`);
      version = cached;
    }
  }

  const binaryPath = path.join(binDir, version, binaryName);
  if (!existsSync(binaryPath)) {
    try {
      await install(version, binaryPath);
    } catch (error) {
      fail(error.message);
    }
  }
  exec(binaryPath);
}

function newestCachedVersion(binDir) {
  if (!existsSync(binDir)) {
    return null;
  }
  return (
    readdirSync(binDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(path.join(binDir, entry.name, binaryName)))
      .map((entry) => entry.name)
      .sort(compareVersions)
      .pop() ?? null
  );
}

function compareVersions(a, b) {
  const parts = (v) => v.replace(/^v/, "").split(/[.-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const [x, y] = [pa[i] ?? 0, pb[i] ?? 0];
    if (x === y) continue;
    return typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
  }
  return 0;
}

main();
