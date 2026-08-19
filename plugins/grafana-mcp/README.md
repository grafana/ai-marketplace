# Grafana MCP

Cursor plugin that exposes the official [Grafana MCP server](https://github.com/grafana/mcp-grafana) for AI-assisted observability workflows.

**Note:** This plugin adds 40+ MCP tools to your context window. Only enable it when you need to interact with a live Grafana instance. For skills and rules around Grafana Assistant development, install the **grafana-assistant** plugin instead.

## Prerequisites

1. A runtime for the MCP server, depending on your platform:

   | Platform | Requirement |
   |---|---|
   | Claude Code, Claude Desktop | [Node.js](https://nodejs.org/) 18 or later |
   | Cursor, Kiro, Codex, Grok | [Docker](https://docs.docker.com/get-docker/), installed and running |

   On Claude, the plugin runs the official `mcp-grafana` release binary directly: `scripts/mcp-grafana-launcher.mjs` detects your OS *and* CPU architecture, downloads the matching build from [GitHub releases](https://github.com/grafana/mcp-grafana/releases), verifies its SHA-256 checksum against the published manifest, and caches it under `~/.cache/grafana-mcp/bin/<version>` (`%LOCALAPPDATA%\grafana-mcp` on Windows). Everything else runs the `grafana/mcp-grafana` Docker image in stdio mode.

2. Create a [service account](https://grafana.com/docs/grafana/latest/administration/service-accounts/) in Grafana with at least **Viewer** role (or **Editor** for write operations). Generate a token.

## Setup

### Claude Code

When you enable the plugin, Claude Code prompts you for:

- **Grafana instance URL** — e.g. `http://localhost:3000` for local, or `https://<stack>.grafana.net` for Grafana Cloud
- **Service account token** — stored in your system keychain

No shell environment variables required. The launcher installs the server binary on first use, so the first start is slower than later ones.

Two environment variables override its behaviour when you need them:

- `MCP_GRAFANA_VERSION` — install a specific release tag (e.g. `v1.1.0`) instead of the latest
- `MCP_GRAFANA_BINARY` — run an existing binary at this path and skip the download entirely

#### Why a launcher instead of a bundled binary

MCPB manifests can vary the server command by operating system but not by CPU architecture ([modelcontextprotocol/mcpb#10](https://github.com/modelcontextprotocol/mcpb/issues/10), open since June 2025). A bundle that names a single macOS binary therefore fails on any Mac whose architecture it does not match — Intel users get `Bad CPU type in executable` ([grafana/mcp-grafana#1070](https://github.com/grafana/mcp-grafana/issues/1070)). Detecting the architecture at launch time is the workaround that upstream issue settled on, and it keeps every platform on one plugin version.

### Cursor

Export the environment variables before launching Cursor:

```bash
export GRAFANA_URL="http://localhost:3000"
export GRAFANA_SERVICE_ACCOUNT_TOKEN="<your token>"
```

For Grafana Cloud, use your instance URL instead (e.g. `https://myinstance.grafana.net`).

## Available tools

The MCP server provides 40+ tools across these categories:

| Category | Examples |
|---|---|
| Dashboards | search, get summary, get property, patch |
| Datasources | list, get by UID or name |
| Prometheus | PromQL queries, metric metadata, label names/values |
| Loki | LogQL log/metric queries, label metadata, patterns |
| Alerting | list/create/update/delete alert rules, contact points |
| Incidents | search, create, add activity |
| OnCall | schedules, shifts, on-call users, alert groups |
| Navigation | generate deeplinks to dashboards, panels, Explore |
| Annotations | get, create, update, patch, list tags |

See the [mcp-grafana README](https://github.com/grafana/mcp-grafana) for the full tool reference and RBAC requirements.
