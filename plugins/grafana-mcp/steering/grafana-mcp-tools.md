# Grafana MCP Server — Tools & Best Practices

MCP server exposing 50+ Grafana API tools. Supports Grafana 9.0+ (local and Grafana Cloud).

## Configuration

### Environment variables

| Variable | Description |
|---|---|
| `GRAFANA_URL` | Grafana instance URL (default: `http://localhost:3000`) |
| `GRAFANA_SERVICE_ACCOUNT_TOKEN` | Service account token (recommended) |
| `GRAFANA_API_KEY` | API key (deprecated, use service account token) |
| `GRAFANA_USERNAME` + `GRAFANA_PASSWORD` | Basic auth |
| `GRAFANA_ORG_ID` | Organization ID for multi-org setups |
| `GRAFANA_EXTRA_HEADERS` | JSON object with custom HTTP headers |

### Binary config (alternative to Docker)

If you prefer the binary over Docker, update `mcp.json`:

```json
{
  "mcpServers": {
    "grafana": {
      "command": "mcp-grafana",
      "args": [],
      "env": {
        "GRAFANA_URL": "${GRAFANA_URL}",
        "GRAFANA_SERVICE_ACCOUNT_TOKEN": "${GRAFANA_SERVICE_ACCOUNT_TOKEN}"
      }
    }
  }
}
```

## CLI flags

| Flag | Description |
|---|---|
| `-t, --transport` | Transport type: `stdio` (default), `sse`, `streamable-http` |
| `--address` | Host:port for SSE/HTTP (default: `localhost:8000`) |
| `--debug` | Enable debug logging |
| `--log-level` | `debug`, `info`, `warn`, `error` |
| `--disable-write` | Read-only mode (no create/update/delete tools) |
| `--enabled-tools` | Comma-separated list of enabled tool categories |
| `--metrics` | Enable Prometheus metrics at `/metrics` |

## Tool categories

### Dashboards

- `search_dashboards` — search by title/metadata
- `get_dashboard_summary` — compact overview (preferred over full JSON)
- `get_dashboard_property` — extract specific parts via JSONPath
- `get_dashboard_panel_queries` — get panel queries and datasource info
- `get_dashboard_by_uid` — full dashboard JSON (large, avoid unless needed)
- `update_dashboard` — create or update a dashboard
- `patch_dashboard` — targeted modifications without full JSON

### Datasources

- `list_datasources` — list all datasources
- `get_datasource_by_uid` / `get_datasource_by_name` — get datasource details

### Prometheus

- `query_prometheus` — execute PromQL queries
- `list_prometheus_metric_metadata` — get metric metadata
- `list_prometheus_metric_names` — list available metrics
- `list_prometheus_label_names` / `list_prometheus_label_values` — label discovery
- `query_prometheus_histogram` — calculate histogram percentiles

### Loki

- `query_loki_logs` — query logs/metrics using LogQL
- `list_loki_label_names` / `list_loki_label_values` — label discovery
- `query_loki_stats` — stream statistics
- `query_loki_patterns` — detected log patterns

### Alerting

- `list_alert_rules` / `get_alert_rule_by_uid` — read alert rules
- `create_alert_rule` / `update_alert_rule` / `delete_alert_rule` — manage rules
- `list_contact_points` — notification endpoints

### Incidents

- `list_incidents` / `get_incident` — read incidents
- `create_incident` / `add_activity_to_incident` — manage incidents

### OnCall

- `list_oncall_schedules` / `get_oncall_shift` / `get_current_oncall_users` — schedules
- `list_oncall_teams` / `list_oncall_users` — team/user discovery
- `list_alert_groups` / `get_alert_group` — alert groups

### Sift (investigation)

- `list_sift_investigations` / `get_sift_investigation` / `get_sift_analysis`
- `find_error_pattern_logs` / `find_slow_requests`

### Pyroscope (profiling)

- `list_pyroscope_label_names` / `list_pyroscope_label_values`
- `list_pyroscope_profile_types` / `fetch_pyroscope_profile`

### Annotations

- `get_annotations` / `create_annotation` / `update_annotation` / `patch_annotation`
- `create_graphite_annotation` / `get_annotation_tags`

### Navigation

- `generate_deeplink` — generate URLs for dashboards, panels, Explore

### Rendering

- `get_panel_image` — render panel/dashboard as PNG (requires Image Renderer)

### Disabled by default

These categories must be explicitly enabled with `--enabled-tools`:

- **ClickHouse**: `list_clickhouse_tables`, `describe_clickhouse_table`, `query_clickhouse`
- **CloudWatch**: `list_cloudwatch_namespaces`, `list_cloudwatch_metrics`, `list_cloudwatch_dimensions`, `query_cloudwatch`
- **Elasticsearch**: `query_elasticsearch`
- **Admin**: `list_teams`, `list_users_by_org`, `list_all_roles`, `get_role_details`, `get_role_assignments`
- **Search Logs**: `search_logs` (high-level across ClickHouse and Loki)
- **Query Examples**: `get_query_examples`

## Best practices

### Context window management

- Use `get_dashboard_summary` instead of `get_dashboard_by_uid` to avoid consuming context with full dashboard JSON.
- Use `get_dashboard_property` with JSONPath to extract only the specific parts you need.
- Prefer `patch_dashboard` for targeted modifications over `update_dashboard` with full payload.
- Use `search_dashboards` to discover dashboards before retrieving by UID.
- When presenting Grafana data, use `generate_deeplink` to provide clickable URLs rather than describing navigation steps.

### Querying

- When querying Prometheus, always specify a reasonable time range to avoid overwhelming results.
- When querying Loki, prefer targeted LogQL selectors with label matchers over broad queries.
- Use datasource discovery tools (`list_datasources`, `list_prometheus_metric_names`) before writing queries.

### Safety

- Avoid write operations (`update_dashboard`, `create_incident`, `create_alert_rule`) unless explicitly asked by the user.
- Use `--disable-write` flag for read-only mode when write access isn't needed.
- Disable unused tool categories with `--enabled-tools` to reduce attack surface and context usage.

### RBAC

- **Viewer** role: sufficient for all read operations (dashboards, datasources, queries, annotations)
- **Editor** role: required for write operations (create/update dashboards, alerts, incidents)
- For fine-grained control, use custom roles with specific permissions per tool (see [mcp-grafana README](https://github.com/grafana/mcp-grafana) for the full RBAC matrix)
