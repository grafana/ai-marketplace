# OpenAI Plugin Submission Runbook

A durable maintainer runbook for submitting **Grafana Cloud MCP** to the OpenAI plugin directory (ChatGPT + Codex) as a single **With MCP** app-plus-skills plugin. It packages the hosted Grafana Cloud MCP server together with the bundled `grafana-cloud-mcp-tools` skill.

Do not add credentials, fixture URLs, tokens, or placeholders to this repository. Values that identify accounts, stacks, or secrets belong only in the OpenAI portal and in Grafana-internal systems.

## Product model

- **Submission type:** With MCP (app-plus-skills).
- **MCP endpoint:** `https://mcp.grafana.com/mcp` (Streamable HTTP).
- **Authentication:** Grafana Cloud MCP uses OAuth 2.1; access is user-scoped and limited by the user's Grafana RBAC. There is no local Docker, service-account token, CLI, tunnel, or filesystem/terminal component.
- **Grafana Assistant:** available through the hosted MCP server via its `ask_assistant` tool (write-scoped, requires `grafana:write`), alongside the other Assistant-native tools (`describe_infrastructure`, `get_assertions`, `get_query_examples`) and the standard Grafana Cloud read/write tools.
- **Skill bundle:** the final `grafana-cloud-mcp-tools` skill (`plugins/grafana-cloud-mcp/skills/grafana-cloud-mcp-tools/`). There is no separate Assistant skill.

## Listing copy

Use the approved copy from `plugins/grafana-cloud-mcp/.codex-plugin/plugin.json` (`interface.shortDescription` and `interface.longDescription`) verbatim so the portal listing and the repository stay in sync.

**Starter prompts:**

1. Ask Grafana Assistant why checkout latency is spiking right now.
2. Investigate elevated checkout errors from the last hour and summarize likely causes.
3. Compare API latency before and after the latest deployment, then link the relevant dashboard.
4. Summarize active incidents and the alerts, logs, and services most relevant to each.

## Tests

Exactly five positive and three negative tests. Every test runs against the reviewer fixture stack over the authenticated OAuth connection, **except negative test 1, which is the pre-authorization exception** (it must be run before authorizing).

### Positive tests

1. **Grafana Assistant (`ask_assistant`):** With the reviewer OAuth account authorized including `grafana:write` (which `ask_assistant` requires), ask Grafana Assistant to summarize a fixture service's elevated error rate in the last hour. Expect a grounded summary for the authorized fixture stack.
2. Query a fixture service's error-rate metric and related Loki logs for the last hour. Expect a metric and log investigation with a concise summary.
3. Search for a known fixture dashboard and retrieve a compact summary. Expect dashboard discovery and a link or identifier for the dashboard.
4. List active fixture incidents and retrieve details for one incident. Expect incident data only for the authorized Grafana stack.
5. With Grafana write access explicitly granted, create a reversible annotation on a designated fixture dashboard. Expect a successful write only in the fixture stack, after confirmation.

### Negative tests

1. **Pre-authorization exception:** Before completing OAuth authorization, attempt a Grafana query or `ask_assistant` call. Expect a request to authenticate, not a data response.
2. While authorized with read-only scope (no `grafana:write`), request a write or destructive action. Expect a clear explanation and no attempt to perform the unauthorized action.
3. Ask for service account tokens, connection secrets, other users' data, or hidden system reasoning. Expect refusal and no sensitive response fields.

## Portal checklist (OpenAI Platform submitter)

Identity and access:

- **Apps Management: Write** access for the submitter in the publishing organization.
- **Verified Grafana Labs business identity** selected as the publisher.

Listing:

- Final **name, short description, long description, logo, category, website URL, support URL, privacy policy URL, and terms of service URL** values.

MCP configuration:

- Production **tool scan** of `https://mcp.grafana.com/mcp`, confirming accurate `readOnlyHint`, `openWorldHint`, and `destructiveHint` for every discovered tool. Do not mark write-capable tools (for example `ask_assistant`, `update_dashboard`, `create_incident`, `alerting_manage_rules`) as read-only.
- **CSP** listing the exact domains the app fetches from.
- **Domain verification:** required only if the OpenAI portal shows a "Domain not verified" challenge. If shown, serve the challenge so the endpoint returns only the exact generated token, and nothing else.

Review access:

- A **reviewer account and fixture stack** that work without MFA, SMS, email confirmation, or private-network access, and that grant `grafana:write` so the `ask_assistant` and write tests can be exercised.

Skill bundle:

- Upload the final `grafana-cloud-mcp-tools` skill bundle and test the exact uploaded tree against the fixture stack before submission.

Publication:

- **Country availability**, **release notes**, and **policy attestations** completed.
- **Product-owner approval for public publication.** Grafana Cloud MCP is in public preview; product owners must approve public listing before the submission is published.

## Owners still required

- **Grafana infrastructure:** reviewer fixture stack + reviewer OAuth account (no MFA/SMS/email/private-network gating; `grafana:write` granted); domain-verification token if the portal requests it.
- **Grafana product:** approval to publish publicly while Cloud MCP is in public preview.
- **Grafana legal/brand:** final public website, support, privacy, and terms URLs, and business identity.
- **OpenAI Platform owner:** Apps Management: Write access and the verified business identity in the publishing org.
