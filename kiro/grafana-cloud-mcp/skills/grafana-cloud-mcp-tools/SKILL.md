---
name: grafana-cloud-mcp-tools
description: Connect to and use the Grafana Cloud MCP server effectively, including natural-language Grafana Assistant questions and observability investigations. Covers setup, OAuth authorization, read/write access scopes, choosing tools, and best practices for context window management. Use when the user wants to set up Grafana Cloud MCP, ask Grafana Assistant a question, investigate metrics, logs, traces, profiles, dashboards, alerts, or incidents, needs guidance on which tool to use, or wants to understand access scopes.
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

## Read and write access

On the consent page, the user chooses what to grant:

- **Read**: view dashboards, alerts and incidents, and query data sources. Always granted.
- **Write**: create and change dashboards, alerts, incidents and annotations, and ask Grafana Assistant questions. Can be unchecked for read-only access.

Granting write needs the **Assistant Admin** role or the `grafana-assistant-app.cloud-mcp.scope:write` permission. If **Write** is unavailable on the consent page, a Grafana organization administrator has to grant one of those first.

## Choosing tools

The tool list changes as Grafana adds capabilities, so this skill doesn't list tools. Rely on the server instead:

- Read the server's instructions, which the client receives on connect, and each tool's description. They're kept current with the server and say what each tool does and when to use it.
- Pick tools by what the user is asking about. There are tools for dashboards, data sources, Prometheus, Loki, Tempo and Pyroscope queries, SQL data sources, alerting, incidents, OnCall, annotations, Grafana Assistant investigations, deep links and panel rendering.
- When no dedicated tool covers a task, the server describes fallbacks (a Grafana CLI tool and a raw Grafana API tool). Use those rather than giving up.
- If the user expects a tool that isn't there, it may need write access, or it may not be available on their stack. Say so rather than guessing at a name.

## Grafana Assistant

- For open-ended questions ("Why is checkout latency spiking?", "Summarize the current incident", "Explain this alert"), hand the question to Grafana Assistant. It plans the investigation across metrics, logs and traces and returns a grounded answer. For longer root-cause work, start an Assistant investigation and read its report.
- Asking Grafana Assistant needs write access. Without it, answer from the read-only query tools, and tell the user that Assistant questions need write access, which they can grant by reconnecting.
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

## Safety

- Don't make changes (dashboards, alert rules, incidents, silences) unless the user asked for them. Confirm before anything destructive.
- Access is user-scoped: the agent can do only what the user's Grafana RBAC allows.
