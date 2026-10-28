---
name: grafana-mcp-tools
description: Install, configure, and use the Grafana MCP server (mcp-grafana) effectively. Covers setup via Docker or binary, environment variables, CLI flags, choosing tools, RBAC, and best practices for context window management. Use when the user wants to set up mcp-grafana, configure which Grafana MCP tools are enabled, or needs guidance on using the Grafana MCP tools.
---

# Grafana MCP Server

The open-source Grafana MCP server, [mcp-grafana](https://github.com/grafana/mcp-grafana). It runs locally and connects to any Grafana 9.0+ instance, self-hosted or Grafana Cloud, with a service account token.

## Prerequisites

The MCP server must already be installed. **Don't try to install it yourself.** If it isn't available, stop and tell the user to install it first.

Installation instructions, binaries, Docker images and Helm charts: [github.com/grafana/mcp-grafana](https://github.com/grafana/mcp-grafana)

## Configuration

### Environment variables

| Variable | Description |
|---|---|
| `GRAFANA_URL` | Grafana instance URL (default: `http://localhost:3000`) |
| `GRAFANA_SERVICE_ACCOUNT_TOKEN` | Service account token (recommended) |
| `GRAFANA_API_KEY` | API key (deprecated; use a service account token) |
| `GRAFANA_USERNAME` + `GRAFANA_PASSWORD` | Basic auth |
| `GRAFANA_ORG_ID` | Organization ID for multi-org setups |
| `GRAFANA_EXTRA_HEADERS` | JSON object with custom HTTP headers |

### Setup steps

1. Create a [service account](https://grafana.com/docs/grafana/latest/administration/service-accounts/) in Grafana with at least the **Viewer** role (**Editor** for write operations), and generate a token.
2. Give the server the Grafana URL and the token. Claude Code asks for both when the plugin is enabled. Other agents read them from the `GRAFANA_URL` and `GRAFANA_SERVICE_ACCOUNT_TOKEN` environment variables; the plugin's README shows how.
3. The MCP server starts when your agent loads the plugin.

### Docker and local Grafana

When the server runs in Docker and Grafana runs on the host, use `http://host.docker.internal:3000` as the Grafana URL instead of `http://localhost:3000`.

### Binary instead of Docker

The server also ships as a binary, `mcp-grafana`. To use it, point the server entry in your agent's MCP config at `mcp-grafana` instead of `docker`, with the same two settings. The [mcp-grafana README](https://github.com/grafana/mcp-grafana) has examples for each agent.

## CLI flags

| Flag | Description |
|---|---|
| `-t, --transport` | `stdio` (default), `sse`, or `streamable-http` |
| `--address` | Host:port for SSE/HTTP (default: `localhost:8000`) |
| `--log-level` | `debug`, `info`, `warn`, `error` |
| `--disable-write` | Read-only mode: no tools that create, change or delete |
| `--enabled-tools` | Comma-separated tool categories to enable |
| `--disable-<category>` | Turn off one category |

Some categories are off by default. `mcp-grafana --help` lists every category and the default set for the installed version.

## Choosing tools

The tool list changes between releases, so this skill doesn't list tools. Rely on the server instead:

- Read each tool's description from the server. It says what the tool does and when to use it, and it matches the installed version.
- Pick tools by what the user is asking about. There are categories for dashboards, data sources, Prometheus, Loki, Tempo and Pyroscope queries, SQL and other data sources, alerting, incidents, OnCall, annotations, deep links and panel rendering.
- If the user expects a tool that isn't there, its category may be disabled, or the server may be in read-only mode. Point them to `--enabled-tools` or `--disable-write` rather than guessing at a name.

## Keeping context small

- Prefer the tools that return a dashboard's summary or a single property over the one that returns its full JSON. For edits, prefer targeted changes over resending the whole dashboard.
- Search for dashboards, folders and data sources before fetching one by UID.
- Discover metric and label names before writing PromQL or LogQL, rather than guessing.
- Give link-generating tools priority when presenting results: a clickable deep link beats describing how to navigate there.
- Enable only the categories you need. Every enabled tool costs context.

## Querying

- Always set a time range. Start narrow (the last hour, say) and widen it only if needed.
- In Loki, use label matchers to select streams before filtering on line content.
- Aggregate before returning series: a `sum by (...)` or `topk` is usually more useful than hundreds of raw series.

## Safety

- Don't make changes (dashboards, alert rules, incidents, annotations) unless the user asked for them. Confirm before anything destructive.
- Use `--disable-write` when write access isn't needed.

## RBAC

- **Viewer**: enough for read operations (dashboards, data sources, queries, annotations).
- **Editor**: needed for write operations (dashboards, alert rules, incidents).
- For finer control, give the service account a custom role. The [mcp-grafana README](https://github.com/grafana/mcp-grafana) lists the permissions each tool needs.
