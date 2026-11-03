# Grafana Cloud

Plugin that connects AI agents to the hosted [Grafana Cloud MCP server](https://grafana.com/docs/grafana-cloud/machine-learning/assistant/configure/cloud-mcp/) for AI-assisted observability workflows.

The Cloud MCP server is fully hosted and uses OAuth 2.1 authorization — no local installation or service account tokens required.

**Using claude.ai, Claude Desktop, mobile, or Cowork?** Add the Grafana Cloud connector (`https://mcp.grafana.com/mcp`) under [**Customize → Connectors**](https://claude.ai/customize/connectors) (on Team or Enterprise, an Owner adds it under [**Organization settings → Connectors**](https://claude.ai/admin-settings/connectors)). This plugin uses the same server and sign-in, and adds the `grafana-cloud-mcp-tools` skill — install it as well as the connector where plugins are supported, and you'll see one set of tools, not two.

## Prerequisites

1. A **Grafana Cloud** account. Self-hosted users should use the [grafana-mcp](../grafana-mcp/) plugin instead.
2. An administrator must accept the Grafana Assistant terms and conditions.
3. You need the **Assistant Cloud MCP User** role or the `grafana-assistant-app.cloud-mcp:access` permission. Users with **Editor** role or higher have this by default.

## Setup

No local installation or environment variables required. When your AI agent first connects, you'll be prompted to sign in through your browser, choose the Grafana Cloud stack, and choose which access to grant. Your OAuth token is valid for 1 hour and refreshes automatically for 30 days.

The consent page offers three access levels, each as its own checkbox:

| Level | What the connection can do | Who can grant it |
| --- | --- | --- |
| **Read** | View dashboards, alerts, incidents, metrics, logs, traces and profiles, and query Prometheus, Loki, Tempo and Pyroscope | **Assistant Cloud MCP User** |
| **Query** | Run raw queries against SQL data sources such as ClickHouse, Snowflake, Athena and InfluxDB. These run as written, so they can change data | **Assistant Cloud MCP User**, which every Editor holds by default |
| **Write** | Create, modify and delete anything you can in Grafana, including asking Grafana Assistant and starting Assistant investigations. Includes Query and Read | **Assistant Admin**, or the `grafana-assistant-app.cloud-mcp.scope:write` permission |

**For a read-only connection, clear both Query and Write.** Clearing only Write still allows SQL that can change data. See [Manage Assistant access with RBAC](https://grafana.com/docs/grafana-cloud/platform/grafana-assistant/privacy-and-security/rbac/).

## Available tools

The Cloud MCP server provides dozens of tools across these categories:

| Category      | Examples                                                       |
| ------------- | -------------------------------------------------------------- |
| Dashboards    | search, get summary, get property, update                      |
| Datasources   | list, get by UID or name                                       |
| Prometheus    | PromQL queries, metric metadata, label names/values            |
| Loki          | LogQL log/metric queries, label metadata, patterns             |
| Tempo         | TraceQL queries, attribute discovery (proxied from datasource) |
| Pyroscope     | profile queries, label names/values, profile types             |
| SQL           | list databases and tables, describe tables, SQL queries        |
| CloudWatch    | namespaces, metrics, dimensions, queries                       |
| Elasticsearch | Lucene and Query DSL searches                                  |
| Alerting      | alert rules, notification routing, contact points, silences    |
| Incidents     | search, create, add activity                                   |
| OnCall        | schedules, shifts, on-call users, alert groups                 |
| Annotations   | get, create, update, list tags                                 |
| Navigation    | generate deeplinks to dashboards, panels, Explore              |
| Rendering     | export dashboard panels as PNG images                          |
| Assistant     | ask Grafana Assistant, run investigations and read reports     |

See the [Grafana Cloud MCP documentation](https://grafana.com/docs/grafana-cloud/machine-learning/assistant/configure/cloud-mcp/) for the full tool reference.

## Privacy and support

- Privacy policy: <https://grafana.com/legal/privacy-policy/>
- Support: <https://grafana.com/support/> or [open an issue](https://github.com/grafana/ai-marketplace/issues)
