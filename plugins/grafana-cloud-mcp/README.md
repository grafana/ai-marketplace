# Grafana Cloud MCP

Plugin that connects AI agents to the hosted [Grafana Cloud MCP server](https://grafana.com/docs/grafana-cloud/machine-learning/assistant/configure/cloud-mcp/) for AI-assisted observability workflows.

Unlike the local [grafana-mcp](../grafana-mcp/) plugin which runs via Docker, the Cloud MCP server is fully hosted and uses OAuth 2.1 authorization — no local installation or service account tokens required.

## Prerequisites

1. A **Grafana Cloud** account. Self-hosted users should use the [grafana-mcp](../grafana-mcp/) plugin instead.
2. An administrator must accept the Grafana Assistant terms and conditions.
3. You need the **Assistant Cloud MCP User** role or the `grafana-assistant-app.cloud-mcp:access` permission. Users with **Editor** role or higher have this by default.

## Setup

No local installation or environment variables required. When your AI agent first connects, you'll be prompted to enter your Grafana Cloud URL and authorize the connection in your browser. Your OAuth token is valid for 1 hour and refreshes automatically for 30 days.

## Available tools

The Cloud MCP server provides 60+ tools across these categories:

| Category      | Examples                                                       |
| ------------- | -------------------------------------------------------------- |
| Dashboards    | search, get summary, get property, update                      |
| Datasources   | list, get by UID or name                                       |
| Prometheus    | PromQL queries, metric metadata, label names/values            |
| Loki          | LogQL log/metric queries, label metadata, patterns             |
| Tempo         | TraceQL queries, attribute discovery (proxied from datasource) |
| Pyroscope     | profile queries, label names/values, profile types             |
| ClickHouse    | list tables, describe table, SQL queries                       |
| CloudWatch    | namespaces, metrics, dimensions, queries                       |
| Elasticsearch | Lucene and Query DSL searches                                  |
| Alerting      | list/create/update alert rules, routing, contact points        |
| Incidents     | search, create, add activity                                   |
| OnCall        | schedules, shifts, on-call users, alert groups                 |
| Sift          | investigations, analyses, error patterns, slow requests        |
| Annotations   | get, create, update, list tags                                 |
| Navigation    | generate deeplinks to dashboards, panels, Explore              |
| Rendering     | export dashboard panels as PNG images                          |
| Other         | ask_assistant, describe_infrastructure, get_assertions         |

See the [Grafana Cloud MCP documentation](https://grafana.com/docs/grafana-cloud/machine-learning/assistant/configure/cloud-mcp/) for the full tool reference.
