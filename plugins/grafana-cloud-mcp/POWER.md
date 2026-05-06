---
name: "grafana-cloud-mcp"
displayName: "Grafana Cloud MCP"
description: "Hosted MCP server for AI-assisted Grafana Cloud observability: dashboards, datasources, Prometheus, Loki, Tempo, alerting, incidents, OnCall, and more — no local installation required"
keywords: ["grafana", "mcp", "cloud", "observability", "dashboards", "prometheus", "loki", "tempo", "alerting", "incidents", "oncall", "monitoring"]
---

# Grafana Cloud MCP

Connects to the hosted [Grafana Cloud MCP server](https://grafana.com/docs/grafana-cloud/developer-resources/assistant/configure/cloud-mcp/) — 60+ tools for AI-assisted observability workflows across dashboards, datasources, Prometheus, Loki, Tempo, Pyroscope, alerting, incidents, OnCall, and more.

Unlike the local [grafana-mcp](../grafana-mcp/) power which runs via Docker, this server is fully hosted and uses OAuth 2.1 authorization — no local installation or service account tokens required.

> **Note:** This power adds 60+ MCP tools to your context window. Only enable it when you need to interact with a live Grafana Cloud instance.

## Onboarding

### Step 1: Verify Grafana Cloud access

The Cloud MCP server works only with hosted Grafana Cloud environments. Self-hosted Grafana users should use the [grafana-mcp](../grafana-mcp/) power instead.

You need the **Assistant Cloud MCP User** role or the `grafana-assistant-app.cloud-mcp:access` permission. Users with **Editor** role or higher have this by default.

### Step 2: MCP server connects automatically

The `grafana-cloud` MCP server defined in `mcp.json` connects automatically when Kiro loads this power. No local installation or environment variables are required.

When prompted, enter your Grafana Cloud URL and authorize the connection in your browser. Your OAuth token is valid for 1 hour and refreshes automatically for 30 days.

## When to Load Steering Files

- Querying dashboards, datasources, Prometheus, Loki, or Tempo -> `grafana-cloud-mcp-tools.md`
- Managing alerting, incidents, or OnCall -> `grafana-cloud-mcp-tools.md`
- Choosing which tool to use for a task -> `grafana-cloud-mcp-tools.md`
- Understanding read vs write access -> `grafana-cloud-mcp-tools.md`
- Optimizing context window usage -> `grafana-cloud-mcp-tools.md`
