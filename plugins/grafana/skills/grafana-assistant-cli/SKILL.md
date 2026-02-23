---
name: grafana-assistant-cli
description: Use the grafana-assistant CLI to interact with Grafana Assistant via A2A API. Covers configuration, prompting, keeping conversation context, and practical patterns for ops investigations. Use when the user mentions grafana-assistant, Grafana Assistant CLI, assistant tunnel, or wants to query a Grafana instance via the assistant.
---

# grafana-assistant CLI

CLI tool for interacting with Grafana Assistant via the A2A API. Installed at `/usr/local/bin/grafana-assistant`.

## Configuration

Config file: `~/.config/grafana-assistant/config.yaml`
Local override: `./grafana-assistant.yaml` (use `--local` flag)
Environment variables: `GRAFANA_URL`, `GRAFANA_SA_TOKEN`

### Managing instances

```bash
grafana-assistant config set-instance <name> -u <url> -t <token>
grafana-assistant config use-instance <name>
grafana-assistant config current
grafana-assistant config list
grafana-assistant config delete-instance <name>
```

Token can reference env vars: `-t '${MY_TOKEN_VAR}'`

### Managing projects

Projects are named directories the assistant can access via the tunnel.

```bash
grafana-assistant config add-project <name> <path>
grafana-assistant config list-projects
grafana-assistant config remove-project <name>
```

## Prompting (non-interactive, primary mode for agent use)

`grafana-assistant prompt` sends a single message and returns the response. This is the primary command to use from Cursor.

```bash
grafana-assistant prompt "your message here"
grafana-assistant prompt "your message" --json            # JSON output with contextId
grafana-assistant prompt "your message" -c <context-id>   # continue a conversation
grafana-assistant prompt "your message" -a <agent-id>     # specific agent
grafana-assistant prompt "your message" --wait=false      # fire and forget
```

### Keeping conversation context

Each prompt starts a **new, independent conversation** by default. To thread follow-up messages into the same conversation (so the assistant remembers prior context), you must:

1. Use `--json` on the first prompt to capture the `contextId`
2. Pass `-c <contextId>` on all subsequent prompts

```bash
# Step 1: first message — use --json to get contextId
grafana-assistant prompt "Show me metrics for the assistant service in ops-eu-south-0" --json

# Response includes:
# {
#   "taskId": "a2a-...",
#   "contextId": "62a8823a-53ff-4df7-8d2b-129276d7662a",  <-- save this
#   "status": "completed",
#   "response": "..."
# }

# Step 2: follow-ups — pass contextId with -c
grafana-assistant prompt "Now break those down by handler label" -c 62a8823a-53ff-4df7-8d2b-129276d7662a --json
```

**Important caveats:**
- Without `-c`, every prompt is a brand new conversation with no memory of prior messages.
- If context threading fails (e.g. "context was not created by CLI"), include relevant prior findings directly in the prompt text instead. This works well when the context is concise.
- For long multi-step investigations, it's often more reliable to include key findings inline rather than depending on context threading.

### JSON output format

`--json` returns structured output:

```json
{
  "taskId": "a2a-xxx",
  "contextId": "uuid",
  "agentId": "grafana_assistant_cli",
  "status": "completed",
  "response": "The assistant's full text response..."
}
```

Parse `contextId` from the first response and reuse it for follow-ups.

## Chatting (interactive)

Opens a full-screen TUI. Context is maintained automatically within the session.

```bash
grafana-assistant chat
grafana-assistant chat -i <instance>          # specific instance
grafana-assistant chat -a <agent-id>          # specific agent
grafana-assistant chat --continue             # resume previous session
grafana-assistant chat -c <context-id>        # resume specific conversation
grafana-assistant chat --timeout 600          # custom timeout (default: 300s)
```

In-chat commands: `/clear` (new conversation), `/exit` or `Ctrl+C` (quit).

## Listing agents

```bash
grafana-assistant agents
grafana-assistant agents --json
grafana-assistant agents -i <instance>
```

## Assistant Tunnel

The tunnel allows Grafana Assistant to execute tools on your local machine.

```bash
grafana-assistant tunnel auth                    # authenticate (opens browser)
grafana-assistant tunnel connect                 # foreground connection
grafana-assistant tunnel connect --all           # all authenticated instances
grafana-assistant tunnel connect --terminal      # enable terminal tool
grafana-assistant tunnel daemon install          # background service (launchd/systemd)
grafana-assistant tunnel daemon start|stop|restart|status|logs
grafana-assistant tunnel daemon uninstall
```

## Common flags

| Flag | Short | Description |
|------|-------|-------------|
| `--url` | `-u` | Grafana instance URL |
| `--token` | `-t` | Service account token |
| `--instance` | `-i` | Instance name from config |

## Practical patterns for agent use

### Shell permissions

The CLI makes HTTPS requests to Grafana. Always use `required_permissions: ["all"]` in Shell tool calls — this avoids TLS certificate verification failures from sandbox restrictions.

### Timeout handling

Prompts can take 30s–300s depending on how many tools the assistant invokes. Set `block_until_ms` to at least 300000 (5 min) for complex queries.

### What the CLI agent can do

The CLI agent is a **read-only** Grafana Assistant. It queries and analyzes data but cannot modify anything in Grafana.

**Capabilities:**
- Query metrics (PromQL, Graphite), logs (LogQL), traces (TraceQL), profiles, SQL, and more across all configured datasources
- Discover datasources, metric names, label values, and log streams
- Search dashboards and read panel definitions
- Search Grafana docs and blog posts
- Query alert history, on-call schedules, and incidents
- Query Asserts entity health, graph, and RCA patterns
- Query infrastructure memory service

**Workflows it follows:**
- **Quick data query**: discovers datasources → discovers metric/log names → executes query → presents findings
- **Investigation**: follows signals across metrics → logs → traces to find probable cause
- **Q&A / doc search**: answers Grafana/observability questions using docs

**Not available in CLI** (web/Slack only):
- Dashboard creation/modification
- Alert rule and silence management
- Navigation to Grafana pages
