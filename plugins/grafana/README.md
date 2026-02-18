# Grafana

Cursor plugin that exposes the official [Grafana MCP server](https://github.com/grafana/mcp-grafana) for AI-assisted observability workflows.

## Included components

- `mcp.json` — MCP server configuration for `mcp-grafana`
- `rules/grafana-assistant.mdc` — best practices for using Grafana tools effectively

## Prerequisites

1. Install `mcp-grafana` (choose one):

   ```bash
   # From source (requires Go)
   go install github.com/grafana/mcp-grafana/cmd/mcp-grafana@latest

   # Or download a binary from GitHub releases
   # https://github.com/grafana/mcp-grafana/releases
   ```

2. Create a [service account](https://grafana.com/docs/grafana/latest/administration/service-accounts/) in Grafana with at least **Viewer** role (or **Editor** for write operations). Generate a token.

3. Set environment variables:

   ```bash
   export GRAFANA_URL="http://localhost:3000"
   export GRAFANA_SERVICE_ACCOUNT_TOKEN="<your token>"
   ```

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
