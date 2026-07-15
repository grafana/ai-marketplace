# OpenAI Plugin Submission Packet

This document prepares a single Grafana submission for the OpenAI plugin directory (ChatGPT + Codex). The OpenAI Platform submitter must complete the portal fields, domain verification, tool scan, policy attestations, and final publication.

## Grafana Cloud MCP

**Submission type:** With MCP (app-plus-skills)

**MCP server:** `https://mcp.grafana.com/mcp`

**Packaging:** One plugin, `grafana-cloud-mcp`, combining the hosted Grafana Cloud MCP server with a bundled Grafana Assistant skill. Grafana Assistant is not a separate CLI or app here — it is available **through the hosted MCP connection** via the server's `ask_assistant` capability, alongside the rest of the Grafana Cloud tools.

**Short description:** Connect Codex to your Grafana Cloud stack to query metrics, logs, traces, and profiles, investigate incidents, act on dashboards and alerts, and ask Grafana Assistant—all through a single hosted MCP endpoint with no self-hosting required.

**Long description:**

The Grafana Cloud hosted MCP server gives Codex secure, authenticated access to your full observability stack — and to Grafana Assistant — via the Model Context Protocol. It exposes Grafana Cloud's core APIs and Assistant capabilities as tools Codex can call directly, eliminating the need to run or maintain a local MCP server.

Capabilities:

- **Grafana Assistant:** Ask Grafana Assistant natural-language questions through the hosted MCP `ask_assistant` capability to investigate data, summarize incidents, and explain signals.
- **Metrics, logs, traces, profiles:** Query Prometheus/Mimir, Loki, Tempo, and Pyroscope data sources with native PromQL, LogQL, and TraceQL.
- **Dashboards & data sources:** List, search, read, and update dashboards; inspect data source configuration and health.
- **Alerting:** List and inspect alert rules with full configuration and state; create, update, and delete alert rules; list notification contact points.
- **Incident response:** Create and update incidents in Grafana Cloud IRM, view on-call schedules, and pull on-call context.
- **Admin & navigation:** Search across your Grafana Cloud instance, retrieve team and folder structure, and generate deep links back to the Grafana Cloud UI.

Common use cases:

- **Troubleshooting with natural language:** Ask Grafana Assistant questions such as, "Why is checkout latency spiking?" and Codex will pull the right metrics, logs, and traces in one flow.
- **On-call copilot work:** Summarize active incidents, draft status updates, and surface relevant runbooks.
- **Dashboard authoring and tuning:** Use natural language to quickly build and edit visualizations.
- **SRE and platform-team automation:** Perform bulk dashboard audits, alert hygiene reviews, and data source inventory checks.
- **Embedding Grafana context into Codex workflows:** Help Codex understand your observability stack—without having to set up local dependencies.

Authentication uses Grafana Cloud access policies, so Codex's permissions are scoped to the same RBAC model as the rest of your stack.

**Starter prompts:**

1. Ask Grafana Assistant why checkout latency is spiking right now.
2. Investigate elevated checkout errors from the last hour and summarize likely causes.
3. Compare API latency before and after the latest deployment, then link the relevant dashboard.
4. Summarize active incidents and the alerts, logs, and services most relevant to each.

## Tests

Exactly five positive and three negative tests. All tests run against the reviewer fixture stack over the authenticated OAuth connection.

### Positive tests

1. **Grafana Assistant (`ask_assistant`):** With the reviewer OAuth account authorized, ask Grafana Assistant to summarize a fixture service's elevated error rate in the last hour. Expect the `ask_assistant` tool to return a grounded summary for the authorized fixture stack.
2. Query a fixture service's error-rate metric and related Loki logs for the last hour. Expect a metric and log investigation with a concise summary.
3. Search for a known fixture dashboard and retrieve a compact summary. Expect dashboard discovery and a link or identifier for the dashboard.
4. List active fixture incidents and retrieve details for one incident. Expect incident data only for the authorized Grafana stack.
5. With Grafana write access explicitly granted, create a reversible annotation on a designated fixture dashboard. Expect a successful write only in the fixture stack, after confirmation.

### Negative tests

1. Attempt a Grafana query or `ask_assistant` call before OAuth authorization. Expect a request to authenticate, not a data response.
2. Request a write or destructive action that exceeds the granted OAuth scope. Expect a clear explanation and no attempt to perform the unauthorized action.
3. Ask for service account tokens, connection secrets, other users' data, or hidden system reasoning. Expect refusal and no sensitive response fields.

## Skill bundle

- Upload the final `grafana-cloud-mcp` skill bundle (the `plugins/grafana-cloud-mcp/skills/` tree, including the `grafana-assistant` skill) as part of the app-plus-skills submission.
- Test the exact uploaded skill tree against the fixture stack before submission.

## Submitter inputs (portal)

- Select Grafana Labs' verified business identity.
- Confirm the public website, support URL, privacy policy, and terms URLs match that identity.
- Complete the domain challenge at `/.well-known/openai-apps-challenge`.
- Scan the production MCP server and confirm every discovered tool — including `ask_assistant` — has accurate read-only, open-world, and destructive annotations. Do not mark write-capable tools as read-only.
- Provide a reviewer-ready OAuth test account authorized against the fixture stack.
- Select availability only for countries where Grafana support and legal terms are ready.
- Add release notes and complete policy attestations.
