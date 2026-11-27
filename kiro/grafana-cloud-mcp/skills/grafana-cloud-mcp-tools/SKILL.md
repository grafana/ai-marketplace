---
name: grafana-cloud-mcp-tools
description: Connect to and use the Grafana Cloud MCP server effectively, including natural-language Grafana Assistant questions and observability investigations. Covers setup, OAuth authorization, the Read, Query and Write access levels, confirming writes, choosing tools, and best practices for context window management. Use when the user wants to set up Grafana Cloud MCP, ask Grafana Assistant a question, investigate metrics, logs, traces, profiles, dashboards, alerts, or incidents, needs guidance on which tool to use, or wants to understand access scopes.
---

# Grafana Cloud MCP Server

Grafana's hosted MCP server for Grafana Cloud, at `https://mcp.grafana.com/mcp`. It uses Streamable HTTP and OAuth 2.1. There's nothing to install and no token to manage.

## Prerequisites

- A Grafana Cloud account. For self-hosted Grafana, use the local OSS MCP server instead.
- The **Assistant Cloud MCP User** role, or the `grafana-assistant-app.cloud-mcp:access` permission. Editor and higher have it by default.
- An administrator must have accepted the Grafana Assistant terms and conditions.

## Connecting

1. The server connects when the plugin loads.
2. When prompted, sign in through your browser and choose the Grafana Cloud stack to connect to.
3. The OAuth token lasts 1 hour and refreshes automatically for 30 days. After that, sign in again.

## Access levels

The consent page shows three access levels, each as its own checkbox:

- **Read**: view dashboards, alerts, incidents, metrics, logs, traces and profiles, and query Prometheus, Loki, Tempo and Pyroscope.
- **Query**: run raw queries against SQL data sources such as ClickHouse, Snowflake, Athena and InfluxDB. These run as written, so they can change data. Included in **Assistant Cloud MCP User**, so every Editor can grant it by default.
- **Write**: create, modify and delete anything the user can in Grafana, including asking Grafana Assistant and starting Assistant investigations. Includes Query and Read. Granting it needs the **Assistant Admin** role or the `grafana-assistant-app.cloud-mcp.scope:write` permission.

For a read-only connection, clear both **Query** and **Write**. Clearing only Write still allows SQL that can change data. If a checkbox is unavailable, the user doesn't hold the role that grants it, and a Grafana organization administrator has to grant it first.

## Choosing tools

The tool list changes as Grafana adds capabilities, so this skill doesn't list tools. Rely on the server instead:

- Read the server's instructions, which the client receives on connect, and each tool's description. They're kept current with the server and say what each tool does and when to use it.
- Pick tools by what the user is asking about. There are tools for dashboards, data sources, Prometheus, Loki, Tempo and Pyroscope queries, SQL data sources, alerting, incidents, OnCall, annotations, Grafana Assistant investigations, deep links and panel rendering.
- When no dedicated tool covers a task, the server describes fallbacks: a Grafana CLI tool and a raw Grafana API tool. Use them only to read (GET requests with the API tool, read commands with the CLI tool) unless the user asked for a change; then follow the rules for writes below.
- The SQL query tools run a query exactly as written. Run only `SELECT` queries unless the user asked for a change, and treat any other statement as a write.
- If the user expects a tool that isn't there, the connection may not have that access level, or the feature may not be available on their stack. Say so rather than guessing at a name.

## Grafana Assistant

- For open-ended questions ("Why is checkout latency spiking?", "Summarize the current incident", "Explain this alert"), Grafana Assistant can plan the investigation across metrics, logs and traces and return a grounded answer. For longer root-cause work, it can run an Assistant investigation and write a report.
- Asking Grafana Assistant or starting an investigation is a write: it needs **Write** access and counts toward the stack's Grafana Assistant usage. Use it when the user asks for it, or suggest it and follow the rules for writes, showing the exact question.
- Without Write access, answer from the read tools, and tell the user that Assistant questions need Write access, which they can grant by reconnecting.
- Reading existing investigations, their reports and evidence is a read, and is fine at any time.
- For targeted lookups (a known query, dashboard, alert or incident), call the specific tool directly. Going through Assistant there only adds latency.

## Keeping context small

- Prefer the tools that return a dashboard's summary or a single property over the one that returns its full JSON.
- Search for dashboards, folders and data sources before fetching one by UID.
- Discover metric and label names before writing PromQL or LogQL, rather than guessing.
- Give link-generating tools priority when presenting results: a clickable deep link beats describing how to navigate there.

## Querying

- Always set a time range. Start narrow (the last hour, say) and widen it only if needed.
- In Loki, use label matchers to select streams before filtering on line content.
- Aggregate before returning series: a `sum by (...)` or `topk` is usually more useful than hundreds of raw series.

## Rules for writes

A write is any call that creates, changes or deletes something in Grafana (dashboards, alert rules, silences, incidents, annotations, data sources), asks Grafana Assistant a question, starts an Assistant investigation, or runs SQL other than `SELECT`.

1. Only make a write when the user asked for it. Otherwise, suggest it.
2. Before each write, show the user exactly what you'll do: the tool, the target, and the full change, query or question.
3. Ask for confirmation immediately before the call, and make it only after the user confirms.
4. If the user declines, don't retry, and don't try another tool or route to the same effect.

Access is user-scoped: the agent can do only what the user's Grafana RBAC and the granted access levels allow.
