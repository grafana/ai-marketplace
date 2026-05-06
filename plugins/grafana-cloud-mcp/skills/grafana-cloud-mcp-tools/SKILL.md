---
name: grafana-cloud-mcp-tools
description: Connect to and use the Grafana Cloud MCP server effectively. Covers setup, OAuth authorization, tool categories, read/write access scopes, and best practices for context window management. Use when the user wants to set up Grafana Cloud MCP, needs guidance on which tool to use, or wants to understand access scopes.
---

# Grafana Cloud MCP Server

Hosted MCP server providing 60+ Grafana Cloud tools via Streamable HTTP transport with OAuth 2.1 authorization.

## Prerequisites

- Grafana Cloud account (self-hosted users should use the local OSS MCP server instead)
- **Assistant Cloud MCP User** role or `grafana-assistant-app.cloud-mcp:access` permission (Editor role or higher has this by default)
- An administrator must have accepted the Grafana Assistant terms and conditions

## Configuration

The Cloud MCP server connects via `https://mcp.grafana.com/mcp` using Streamable HTTP transport. No local installation or environment variables are required.

### Setup steps

1. The MCP server connects automatically when the plugin loads.
2. When prompted, enter your Grafana Cloud URL and authorize the connection in your browser.
3. Your OAuth token is valid for 1 hour and refreshes automatically for 30 days.

## Read and write access

When authorizing, you choose which permissions to grant:

- **Read access**: View dashboards, alerts, incidents, and query data sources. Always available.
- **Write access**: Create and modify dashboards, alerts, and incidents. You can uncheck this to grant read-only access.

Organization Admins can grant write access by default. If write access is disabled on the consent page, the user needs the **Assistant Admin** role.

## Tool categories

### Search and navigation

- `search_dashboards` — search for dashboards by query string
- `search_folders` — search for folders by query string
- `generate_deeplink` — generate deeplink URLs for dashboards, panels, and Explore queries

### Dashboards and folders

- `get_dashboard_by_uid` — retrieve the complete dashboard JSON by UID
- `get_dashboard_summary` — compact summary without full JSON (preferred)
- `get_dashboard_property` — extract specific parts via JSONPath
- `get_dashboard_panel_queries` — retrieve panel queries with template variable substitution
- `update_dashboard` — create or update a dashboard (**Write**)
- `create_folder` — create a Grafana folder (**Write**)

### Datasources

- `list_datasources` — list all configured data sources with optional type filtering
- `get_datasource` — get detailed information by UID or name

### Prometheus

- `list_prometheus_metric_names` — discover available metrics with regex filtering
- `list_prometheus_metric_metadata` — list metadata about currently scraped metrics
- `list_prometheus_label_names` — list label names with optional series selector
- `list_prometheus_label_values` — get values for a specific label
- `query_prometheus` — execute PromQL instant or range queries
- `query_prometheus_histogram` — query histogram percentiles

### Loki

- `list_loki_label_names` — list available label names in logs
- `list_loki_label_values` — get unique values for a specific label
- `query_loki_logs` — execute LogQL queries for log entries or metric values
- `query_loki_stats` — get statistics about log streams
- `query_loki_patterns` — detect and analyze common log patterns

### Tempo

If you have Tempo data sources, the Cloud MCP server proxies tools from the Tempo data source, including TraceQL queries and attribute discovery.

### Pyroscope

- `list_pyroscope_label_names` — list available label names in profiles
- `list_pyroscope_label_values` — list values for a specific label
- `list_pyroscope_profile_types` — list available profile types
- `query_pyroscope` — query profiles or metrics from Pyroscope

### ClickHouse

- `list_clickhouse_tables` — list available tables with metadata
- `describe_clickhouse_table` — get column schema for a table
- `query_clickhouse` — execute SQL queries against ClickHouse datasources

### CloudWatch

- `list_cloudwatch_namespaces` — list available AWS namespaces
- `list_cloudwatch_metrics` — list metrics for a namespace
- `list_cloudwatch_dimensions` — list dimension keys for a metric
- `query_cloudwatch` — query AWS CloudWatch metrics

### Elasticsearch

- `query_elasticsearch` — execute Lucene or Query DSL searches

### Alerting

- `alerting_manage_rules` — list, filter, create, and update alert rules (Read / **Write**)
- `alerting_manage_routing` — view routing configuration, notification policies, contact points (Read)

### Annotations

- `get_annotations` — fetch annotations filtered by dashboard UID, time range, or tags
- `get_annotation_tags` — get annotation tags with optional filtering
- `create_annotation` — create a new annotation (**Write**)
- `update_annotation` — update an existing annotation (**Write**)

### Incidents

- `list_incidents` — list incidents with optional status filtering
- `get_incident` — get full incident details by ID
- `create_incident` — create a new incident (**Write**)
- `add_activity_to_incident` — add a note to an incident's timeline (**Write**)

### OnCall

- `list_oncall_schedules` — list OnCall schedules with optional team filtering
- `get_oncall_shift` — get detailed shift information
- `get_current_oncall_users` — get users currently on-call for a schedule
- `list_oncall_teams` — list OnCall teams
- `list_oncall_users` — list OnCall users with optional filtering
- `list_alert_groups` — list alert groups with filtering
- `get_alert_group` — get a specific alert group by ID

### Sift

- `list_sift_investigations` — list Sift investigations
- `get_sift_investigation` — retrieve a Sift investigation by UUID
- `get_sift_analysis` — retrieve a specific analysis from an investigation
- `find_error_pattern_logs` — search Loki logs for elevated error patterns (**Write**)
- `find_slow_requests` — search Tempo datasources for slow requests (**Write**)

### Other tools

- `ask_assistant` — send a prompt to Grafana Assistant and get the full reply (**Write**)
- `get_assertions` — get assertion summary for an entity
- `get_panel_image` — render a dashboard panel as a PNG image
- `describe_infrastructure` — retrieve pre-built summaries of service groups
- `get_query_examples` — get example queries for datasource types

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
