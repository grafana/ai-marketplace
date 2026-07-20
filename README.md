# Grafana AI Marketplace

Plugin marketplace for AI-assisted Grafana observability workflows in **Cursor**, **Claude Code**, **Kiro**, **Grok Build**, and **Codex**.

Two ways to connect Grafana, depending on the plugin:

- **Hosted Grafana Cloud MCP** (`grafana-cloud-mcp`) — the hosted `https://mcp.grafana.com/mcp` server over Streamable HTTP with OAuth 2.1. No local Docker and no service-account token.
- **Local Grafana MCP** (`grafana-mcp`) — the official [`grafana/mcp-grafana`](https://github.com/grafana/mcp-grafana) Docker image in stdio mode, using a Grafana service-account token.

## Getting started

### Hosted Grafana Cloud MCP (OAuth, no local setup)

1. Have a Grafana Cloud account with the **Assistant Cloud MCP User** role or the `grafana-assistant-app.cloud-mcp:access` permission (Editor and higher have it by default).
2. Install the `grafana-cloud-mcp` plugin from your platform's marketplace.
3. When prompted, enter your Grafana Cloud URL and authorize the connection in your browser. Choose read-only or read + write access during consent.

Authorizing **read + write** access additionally requires the **Assistant Admin** role or the `grafana-assistant-app.cloud-mcp.scope:write` permission. If **Write** is unavailable on the OAuth consent page, ask your Grafana organization administrator to grant it.

No Docker, environment variables, or service-account token are required.

### Local Grafana MCP (Docker + service-account token)

1. [Docker](https://docs.docker.com/get-docker/) must be installed and running.
2. Create a [service account](https://grafana.com/docs/grafana/latest/administration/service-accounts/) in Grafana with at least **Viewer** role (or **Editor** for write operations) and generate a token.
3. Set environment variables:

   ```bash
   export GRAFANA_URL="http://localhost:3000"
   export GRAFANA_SERVICE_ACCOUNT_TOKEN="<your token>"
   ```

   For Grafana Cloud, use your instance URL instead (e.g. `https://myinstance.grafana.net`).
4. Install the `grafana-mcp` plugin from your platform's marketplace.

### Add this marketplace

Claude Code:

```shell
/plugin marketplace add grafana/ai-marketplace
/plugin install grafana-cloud-mcp@grafana-ai-marketplace
```

Codex:

```shell
codex plugin marketplace add grafana/ai-marketplace
```

Cursor, Kiro, and Grok Build install from their respective marketplace UIs.

## What's included

- **`grafana-cloud-mcp`** — hosted Grafana Cloud MCP server (OAuth 2.1), plus the `grafana-cloud-mcp-tools` skill covering 60+ tools for dashboards, datasources, Prometheus, Loki, Tempo, Pyroscope, alerting, incidents, OnCall, annotations, and Grafana Assistant (`ask_assistant`). Packaged for Codex as an app-plus-skills plugin.
- **`grafana-mcp`** — local `grafana/mcp-grafana` Docker MCP server (stdio) for self-hosted or token-based setups.
- **`grafana-assistant`** — skills and rules for developing and using the Grafana Assistant app and CLI (Cursor/Claude/Kiro/Grok).

See each plugin's `README.md` for its full tool reference.

## Architecture

Each plugin ships manifests for the platforms it targets and shares components (rules, skills, MCP config) where the formats allow. Not every plugin targets every platform, and platform manifests are not automatically identical — each format has its own manifest and, where needed, format-specific fields.

```text
plugins/grafana-cloud-mcp/
├── .cursor-plugin/plugin.json   # Cursor manifest
├── .claude-plugin/plugin.json   # Claude Code manifest
├── .grok-plugin/plugin.json     # Grok Build manifest (when targeted)
├── .codex-plugin/plugin.json    # Codex manifest (mcpServers + skills + listing metadata)
├── POWER.md                     # Kiro manifest (frontmatter + onboarding)
├── .mcp.json                    # Hosted MCP server config (Streamable HTTP)
├── mcp.json                     # Shared MCP server config
├── skills/                      # Shared skills (SKILL.md)
├── assets/logo.svg              # Marketplace/listing logo
└── steering/                    # Kiro steering files
```

Root marketplace manifests:

- `.cursor-plugin/marketplace.json` — Cursor Marketplace
- `.claude-plugin/marketplace.json` — Claude Code plugin registry
- `.grok-plugin/marketplace.json` — Grok Build plugin marketplace
- `.kiro-power/marketplace.json` — Kiro Powers registry
- `.agents/plugins/marketplace.json` — Codex marketplace

Versions are kept in sync across the Cursor and Claude Code formats and validated in CI.

## Development

Validate the plugin structure across all formats:

```bash
node scripts/validate-template.mjs
```

To add a plugin, create a directory under `plugins/` and register it in the applicable marketplace manifests. See `docs/add-a-plugin.md` for details.
