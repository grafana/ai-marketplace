---
name: "grafana-mcp"
displayName: "Grafana MCP"
description: "AI-assisted Grafana observability: dashboards, datasources, Prometheus, Loki, alerting, incidents, OnCall, and more via the official MCP server"
keywords: ["grafana", "mcp", "observability", "dashboards", "prometheus", "loki", "alerting", "incidents", "oncall", "monitoring"]
---

# Grafana MCP

Exposes the official [Grafana MCP server](https://github.com/grafana/mcp-grafana) — 50+ tools for AI-assisted observability workflows across dashboards, datasources, Prometheus, Loki, alerting, incidents, OnCall, and more.

> **Note:** This power adds 50+ MCP tools to your context window. Only enable it when you need to interact with a live Grafana instance.

## Onboarding

### Step 1: Validate Docker is running

The MCP server runs via Docker. Before proceeding, verify Docker is available:

```bash
docker --version
```

**CRITICAL:** If Docker is not installed or not running, DO NOT proceed. Direct the user to [install Docker Desktop](https://docs.docker.com/get-docker/) first.

### Step 2: Set environment variables

The following environment variables must be set before the MCP server starts:

```bash
export GRAFANA_URL="http://localhost:3000"
export GRAFANA_SERVICE_ACCOUNT_TOKEN="<your token>"
```

For Grafana Cloud, use your instance URL instead (e.g. `https://myinstance.grafana.net`).

If the variables are not set, tell the user to:
1. Create a [service account](https://grafana.com/docs/grafana/latest/administration/service-accounts/) in Grafana with at least **Viewer** role (or **Editor** for write operations).
2. Generate a token and export it as shown above.

### Step 3: MCP server starts automatically

Once environment variables are set, the `grafana` MCP server defined in `mcp.json` starts automatically when Kiro loads this power.

When connecting to a local Grafana running on `localhost` from within Docker, use `host.docker.internal`:

```json
{
  "env": {
    "GRAFANA_URL": "http://host.docker.internal:3000"
  }
}
```

## When to Load Steering Files

- Setting up or configuring the MCP server → `grafana-mcp-tools.md`
- Querying dashboards, datasources, Prometheus, or Loki → `grafana-mcp-tools.md`
- Managing alerting, incidents, or OnCall → `grafana-mcp-tools.md`
- Choosing which tool to use for a task → `grafana-mcp-tools.md`
- Optimizing context window usage → `grafana-mcp-tools.md`
