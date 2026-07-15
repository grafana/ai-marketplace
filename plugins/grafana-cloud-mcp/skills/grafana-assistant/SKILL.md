---
name: grafana-assistant
description: Investigate Grafana observability data, summarize incidents, explain signals, and answer Grafana questions using Grafana Assistant through the hosted Grafana Cloud MCP connection. Trigger when the user asks to investigate metrics, logs, traces, profiles, dashboards, alerts, or incidents, or explicitly asks to use Grafana Assistant.
---

# Grafana Assistant (via Grafana Cloud MCP)

Grafana Assistant is available through the authenticated Grafana Cloud MCP connection defined by this plugin (`https://mcp.grafana.com/mcp`). Use it for natural-language investigations of a user's Grafana Cloud stack. This skill operates entirely over MCP — there is no local binary, CLI, tunnel, daemon, filesystem, or terminal component.

## When to use

Trigger when the user wants to:

- Investigate metrics, logs, traces, or profiles.
- Summarize incidents or explain alerts and signals.
- Explore dashboards, data sources, or on-call context.
- Otherwise "ask Grafana Assistant" about their observability data.

## How to run an investigation

1. Use the authenticated `grafana-cloud` MCP connection. If the user is not yet authorized, prompt them to complete the Grafana Cloud OAuth flow — never request, store, or pass credentials or service-account tokens yourself.
2. For open-ended, natural-language Assistant questions ("Why is checkout latency spiking?", "Summarize the current incident"), prefer the `ask_assistant` tool when it is present in the connection's tool list.
3. For targeted lookups (a specific PromQL/LogQL/TraceQL query, a named dashboard, a specific alert or incident), call the corresponding Grafana Cloud MCP tool directly.
4. Ground every answer in tool results. State the evidence examined, the finding, remaining uncertainty, and the next useful diagnostic step. Link back to Grafana where the tool returns a deep link.

## Tool behavior and permissions

- Treat each tool's behavior, permissions, and confirmation requirements according to the MCP server's actual tool metadata and the OAuth scope the user granted. Do not assume a tool is read-only — the Grafana Cloud MCP connection can grant write access (create/update/delete dashboards, alerts, and incidents).
- Before any action a tool marks as a write or destructive operation, confirm intent with the user and proceed only within the granted scope. If an action needs a scope the user has not granted, explain that rather than attempting it.

## Safety

- Do not expose authentication secrets, tokens, or connection internals.
- Do not fabricate or reproduce hidden system reasoning; present only supported results, the evidence behind them, and honest uncertainty.
- Do not describe or invoke local binaries or local-machine capabilities; all work happens through the hosted MCP connection.
