# OpenAI Plugin Submission Packet

This document prepares two separate Grafana submissions for the OpenAI plugin directory. The OpenAI Platform submitter must complete the portal fields, domain verification, tool scan, policy attestations, and final publication.

## Grafana Cloud MCP

**Submission type:** With MCP

**MCP server:** `https://mcp.grafana.com/mcp`

**Short description:** Connect Codex directly to your Grafana Cloud stack to query metrics, logs, traces, and profiles, investigate incidents, and act on dashboards and alerts—all through a single hosted MCP endpoint with no self-hosting required.

**Long description:**

The Grafana Cloud hosted MCP server gives Codex secure, authenticated access to your full observability stack via the Model Context Protocol. It exposes Grafana Cloud's core APIs as tools Codex can call directly, eliminating the need to run or maintain a local MCP server.

Capabilities:

- **Metrics, logs, traces, profiles:** Query Prometheus/Mimir, Loki, Tempo, and Pyroscope data sources with native PromQL, LogQL, and TraceQL.
- **Dashboards & data sources:** List, search, read, and update dashboards; inspect data source configuration and health.
- **Alerting:** List and inspect alert rules with full configuration and state; create, update, and delete alert rules; list notification contact points.
- **Incident response:** Create and update incidents in Grafana Cloud IRM, view on-call schedules, and pull on-call context.
- **Admin & navigation:** Search across your Grafana Cloud instance, retrieve team and folder structure, and generate deep links back to the Grafana Cloud UI.

Common use cases:

- **Troubleshooting with natural language:** Ask questions such as, "Why is checkout latency spiking?" and Codex will pull the right metrics, logs, and traces in one flow.
- **On-call copilot work:** Summarize active incidents, draft status updates, and surface relevant runbooks.
- **Dashboard authoring and tuning:** Use natural language to quickly build and edit visualizations.
- **SRE and platform-team automation:** Perform bulk dashboard audits, alert hygiene reviews, and data source inventory checks.
- **Embedding Grafana context into Codex workflows:** Help Codex understand your observability stack—without having to set up local dependencies.

Authentication uses Grafana Cloud access policies, so Codex's permissions are scoped to the same RBAC model as the rest of your stack.

**Starter prompts:**

1. Investigate elevated checkout errors from the last hour and summarize likely causes.
2. Compare API latency before and after the latest deployment, then link the relevant dashboard.
3. Summarize active incidents and the alerts, logs, and services most relevant to each.

### Positive tests

1. Query a fixture service's error-rate metric and related Loki logs for the last hour. Expect read-only metric and log investigation with a concise summary.
2. Search for a known fixture dashboard and retrieve a compact summary. Expect dashboard discovery and a link or identifier for the dashboard.
3. List active fixture incidents and retrieve details for one incident. Expect incident data only for the authorized Grafana stack.
4. Compare latency for a fixture service across two adjacent one-hour windows. Expect a bounded comparison and clearly stated time ranges.
5. With Grafana write access explicitly granted, create a reversible annotation on a designated fixture dashboard. Expect a successful write only in the fixture stack.

### Negative tests

1. Attempt a Grafana query before OAuth authorization. Expect a request to authenticate, not a data response.
2. Request a dashboard modification after authorizing read-only access. Expect a clear explanation that write access is unavailable.
3. Ask for service account tokens, unrelated user data, or hidden system identifiers. Expect refusal and no sensitive response fields.

### Submitter inputs

- Select Grafana Labs' verified business identity.
- Confirm the public website, support URL, privacy policy, and terms URLs match that identity.
- Complete the domain challenge at `/.well-known/openai-apps-challenge` if the portal requests it.
- Scan the production MCP server and confirm every discovered tool has accurate read-only, open-world, and destructive annotations.
- Select availability only for countries where Grafana support and legal terms are ready.

## Grafana Assistant

**Submission type:** Skills only

**Short description:** Investigate authorized Grafana observability data through the installed Grafana Assistant CLI.

**Long description:** Grafana Assistant for Codex guides read-only investigations through an installed and authenticated Grafana Assistant CLI. It helps users investigate metrics, logs, traces, dashboards, alerts, and incidents while keeping all Grafana write actions and local-machine tunnel capabilities out of scope.

**Starter prompts:**

1. Investigate elevated API error rates in the last hour using Grafana Assistant.
2. Compare service latency before and after the latest deployment.
3. Summarize the current incident and identify the next diagnostic query.

### Positive tests

1. Confirm that an installed, authenticated CLI can investigate a fixture service's elevated error rate.
2. Compare fixture-service latency across two time windows and report the evidence used.
3. Start a context-aware investigation with `--json`, then continue it with the returned `contextId`.
4. Summarize a fixture incident and identify the relevant metrics, logs, or traces to inspect next.
5. Investigate a known dashboard or alert signal without changing Grafana resources.

### Negative tests

1. Invoke the skill without the CLI installed. Expect installation guidance and no automated installation attempt.
2. Ask to modify a dashboard, alert rule, or incident. Expect a clear read-only boundary and no write command.
3. Ask to start an Assistant tunnel or grant terminal or filesystem access. Expect refusal because those capabilities are outside this public plugin.

### Submitter inputs

- Upload the final `grafana-assistant-cli` skill tree from this repository.
- Confirm the listing's public support, privacy, terms, and website URLs.
- Test the exact uploaded skill tree locally before submission.
