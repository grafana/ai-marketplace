# Grafana Cloud MCP Server — Tools & Best Practices

Hosted MCP server providing 60+ Grafana Cloud tools via Streamable HTTP with OAuth 2.1 authorization.

## Configuration

No local installation or environment variables required. The server connects via `https://mcp.grafana.com/mcp` using Streamable HTTP. When prompted, enter your Grafana Cloud URL and authorize in your browser.

## Read and write access

Access is user-scoped via OAuth 2.1. During authorization, users choose:

- **Read access**: View dashboards, alerts, incidents, and query data sources. Always available.
- **Write access**: Create and modify dashboards, alerts, and incidents. Can be unchecked for read-only access.

Tools marked **Write** below require the `grafana:write` scope.

## Tool categories

### Search and navigation

- `search_dashboards` — search for dashboards by query string
- `search_folders` — search for folders by query string
- `generate_deeplink` — generate deeplink URLs for dashboards, panels, and Explore queries

### Dashboards and folders

- `get_dashboard_by_uid` — full dashboard JSON (large, avoid unless needed)
- `get_dashboard_summary` — compact overview (preferred over full JSON)
- `get_dashboard_property` — extract specific parts via JSONPath
- `get_dashboard_panel_queries` — get panel queries and datasource info
- `update_dashboard` — create or update a dashboard (**Write**)
- `create_folder` — create a Grafana folder (**Write**)

### Datasources

- `list_datasources` — list all datasources with optional type filtering
- `get_datasource` — get datasource details by UID or name

### Prometheus

- `query_prometheus` — execute PromQL instant or range queries
- `list_prometheus_metric_metadata` — get metric metadata
- `list_prometheus_metric_names` — list available metrics with regex filtering
- `list_prometheus_label_names` / `list_prometheus_label_values` — label discovery
- `query_prometheus_histogram` — calculate histogram percentiles

### Loki

- `query_loki_logs` — query logs/metrics using LogQL
- `list_loki_label_names` / `list_loki_label_values` — label discovery
- `query_loki_stats` — stream statistics
- `query_loki_patterns` — detected log patterns

### Tempo

Proxied from Tempo data sources. Available if you have Tempo in your Grafana Cloud stack. Includes TraceQL queries and attribute discovery.

### Pyroscope

- `list_pyroscope_label_names` / `list_pyroscope_label_values` — label discovery
- `list_pyroscope_profile_types` — available profile types
- `query_pyroscope` — query profiles or metrics

### ClickHouse

- `list_clickhouse_tables` — list tables with metadata
- `describe_clickhouse_table` — get column schema
- `query_clickhouse` — execute SQL queries

### CloudWatch

- `list_cloudwatch_namespaces` / `list_cloudwatch_metrics` / `list_cloudwatch_dimensions` — discovery
- `query_cloudwatch` — query AWS CloudWatch metrics

### Elasticsearch

- `query_elasticsearch` — Lucene or Query DSL searches

### Alerting

- `alerting_manage_rules` — list, filter, create, and update alert rules (Read / **Write**)
- `alerting_manage_routing` — view routing, notification policies, contact points (Read)

### Annotations

- `get_annotations` / `get_annotation_tags` — read annotations
- `create_annotation` / `update_annotation` — manage annotations (**Write**)

### Incidents

- `list_incidents` / `get_incident` — read incidents
- `create_incident` / `add_activity_to_incident` — manage incidents (**Write**)

### OnCall

- `list_oncall_schedules` / `get_oncall_shift` / `get_current_oncall_users` — schedules
- `list_oncall_teams` / `list_oncall_users` — team/user discovery
- `list_alert_groups` / `get_alert_group` — alert groups

### Sift (investigation)

- `list_sift_investigations` / `get_sift_investigation` / `get_sift_analysis` — investigations
- `find_error_pattern_logs` / `find_slow_requests` — search for issues (**Write**)

### Other tools

- `ask_assistant` — send a prompt to Grafana Assistant (**Write**)
- `get_assertions` — get assertion summary for an entity
- `get_panel_image` — render panel as PNG image
- `describe_infrastructure` — pre-built summaries of service groups
- `get_query_examples` — example queries for datasource types

## Best practices

### Context window management

- Use `get_dashboard_summary` instead of `get_dashboard_by_uid` to avoid consuming context with full dashboard JSON.
- Use `get_dashboard_property` with JSONPath to extract only the specific parts you need.
- Use `search_dashboards` to discover dashboards before retrieving by UID.
- When presenting Grafana data, use `generate_deeplink` to provide clickable URLs rather than describing navigation steps.

### Querying

- When querying Prometheus, always specify a reasonable time range to avoid overwhelming results.
- When querying Loki, prefer targeted LogQL selectors with label matchers over broad queries.
- Use datasource discovery tools (`list_datasources`, `list_prometheus_metric_names`) before writing queries.

### Safety

- Avoid write operations (`update_dashboard`, `create_incident`, `alerting_manage_rules`) unless explicitly asked by the user.
- If write access was not granted during OAuth authorization, write tools will not be available.

### Access and permissions

- Access is user-scoped: the agent has only the permissions your Grafana RBAC grants you.
- **Editor** role or higher is required to use the Cloud MCP server.
- Write tools require the `grafana:write` scope, granted during OAuth consent.
- Organization Admins can grant write access by default. Others need the **Assistant Admin** role.
