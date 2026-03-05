# Grafana AI Marketplace

Dual-format plugin marketplace that exposes the official [Grafana MCP server](https://github.com/grafana/mcp-grafana) for AI-assisted observability workflows in both **Cursor** and **Claude Code**.

## Getting started

1. [Docker](https://docs.docker.com/get-docker/) must be installed and running.

2. Create a [service account](https://grafana.com/docs/grafana/latest/administration/service-accounts/) in Grafana with at least **Viewer** role (or **Editor** for write operations). Generate a token.

3. Set environment variables:

   ```bash
   export GRAFANA_URL="http://localhost:3000"
   export GRAFANA_SERVICE_ACCOUNT_TOKEN="<your token>"
   ```

   For Grafana Cloud, use your instance URL instead (e.g. `https://myinstance.grafana.net`).

4. Install the plugin from the Cursor Marketplace or Claude Code plugin registry.

### Add plugins in Claude Code

From any Claude Code session, add this marketplace from GitHub:

```shell
/plugin marketplace add grafana/ai-marketplace
```

Install plugins from this marketplace (`grafana-ai-marketplace`):

```shell
/plugin install grafana-assistant@grafana-ai-marketplace
/plugin install grafana-mcp@grafana-ai-marketplace
```

## What's included

- **MCP server** (`mcp.json`) — runs the official `grafana/mcp-grafana` Docker image in stdio mode, providing 40+ tools for dashboards, datasources, Prometheus, Loki, alerting, incidents, OnCall, annotations, and more.
- **Rule** (`rules/grafana-assistant.mdc`) — best practices for using Grafana MCP tools effectively (context window management, write safety, deeplinks).

See [plugins/grafana/README.md](plugins/grafana/README.md) for the full tool reference.

## Dual-format architecture

Each plugin ships manifests for both platforms while sharing all content (rules, skills, MCP config):

```text
plugins/grafana/
├── .cursor-plugin/plugin.json   # Cursor manifest
├── .claude-plugin/plugin.json   # Claude Code manifest
├── mcp.json                     # Shared MCP server config
└── rules/                       # Shared rules
```

Root marketplace manifests:

- `.cursor-plugin/marketplace.json` — Cursor Marketplace
- `.claude-plugin/marketplace.json` — Claude Code plugin registry

Versions are kept in sync across both formats and validated in CI.

## Development

To validate the plugin structure (both formats):

```bash
node scripts/validate-template.mjs
```

To add more plugins, create a new directory under `plugins/` and register it in both marketplace manifests. See `docs/add-a-plugin.md` for details.
