---
name: grafana-assistant-cli
description: Use the grafana-assistant CLI to interact with Grafana Assistant via A2A API. Covers installation, configuration, prompting, keeping conversation context, and practical patterns for ops investigations. Use when the user mentions grafana-assistant, Grafana Assistant CLI, assistant tunnel, or wants to query a Grafana instance via the assistant.
---

# grafana-assistant CLI

CLI tool for interacting with Grafana Assistant via the A2A API.

## Prerequisites

The `grafana-assistant` binary must already be installed and available on `$PATH`. **Do not attempt to install it automatically.** If the command is not found, stop and tell the user to install it first.

Installation instructions and pre-built binaries: [github.com/grafana/assistant-cli](https://github.com/grafana/assistant-cli)

A Docker image is also available: [github.com/grafana/assistant-cli/pkgs](https://github.com/grafana/assistant-cli/pkgs)

## Configuration

### Config file locations (first found wins)

1. `GRAFANA_ASSISTANT_CONFIG` env var (if set)
2. `./grafana-assistant.yaml` (current directory, use `--local` flag)
3. `~/.config/grafana-assistant/config.yaml`

### Config file format

```yaml
current-instance: prod

instances:
  localhost:
    url: http://localhost:3000
    token: glsa_abcd1234
  prod:
    url: https://mystack.grafana.net
    token: ${GRAFANA_PROD_TOKEN}  # env var expansion supported

projects:
  - name: my-app
    path: ~/projects/my-app

tunnel:
  tools:
    filesystem:
      allowed_paths: [/var/log/myapp]
      deny_paths: ["**/*.key", "**/secrets.yaml"]
    terminal:
      allowed_commands: [git, kubectl, docker]
      deny_commands: ["rm -rf"]
      passthrough_env: [AWS_PROFILE, KUBECONFIG]
```

### Environment variables

| Variable | Description |
|---|---|
| `GRAFANA_URL` | Grafana instance URL (overrides config) |
| `GRAFANA_SA_TOKEN` | Service account token (overrides config) |
| `GRAFANA_ASSISTANT_CONFIG` | Override config file path |

### Credential resolution priority

1. `--url` and `--token` flags
2. `GRAFANA_URL` and `GRAFANA_SA_TOKEN` env vars
3. `--instance <name>` flag
4. `current-instance` from config file

### Quick setup

```bash
grafana-assistant config set-instance mystack --url https://mystack.grafana.net
grafana-assistant config use-instance mystack
grafana-assistant auth                    # opens browser for PKCE auth
grafana-assistant chat                    # start interactive chat
```

The **Assistant CLI User** role is required for browser auth. Users with **Editor** role or above get this automatically. For custom roles, include the `grafana-assistant-app.tokens:access` permission.

### Managing instances

```bash
grafana-assistant config set-instance <name> -u <url> -t <token>
grafana-assistant config use-instance <name>
grafana-assistant config current
grafana-assistant config list
grafana-assistant config delete-instance <name>
grafana-assistant config path
```

Token supports env var references: `-t '${MY_TOKEN_VAR}'`

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
# First message — capture contextId
grafana-assistant prompt "Show me metrics for the assistant service in ops-eu-south-0" --json
# Response: { "contextId": "62a8823a-...", "status": "completed", "response": "..." }

# Follow-ups — pass contextId
grafana-assistant prompt "Now break those down by handler label" -c 62a8823a-... --json
```

**Caveats:**
- Without `-c`, every prompt is a brand new conversation with no memory.
- If context threading fails (e.g. "context was not created by CLI"), include relevant prior findings directly in the prompt text instead.
- For long multi-step investigations, including key findings inline is often more reliable than depending on context threading.

### JSON output format

```json
{
  "taskId": "a2a-xxx",
  "contextId": "uuid",
  "agentId": "grafana_assistant_cli",
  "status": "completed",
  "response": "The assistant's full text response..."
}
```

Possible status values: `completed`, `failed`, `timeout`, `canceled`, `unknown`.

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

In-chat commands: `/clear` or `/new` (new conversation), `/exit` or `/quit` or `Ctrl+C` (quit), `/help`.

## Listing agents

```bash
grafana-assistant agents
grafana-assistant agents --json
grafana-assistant agents -i <instance>
```

## Generating AGENTS.md

Generate an `AGENTS.md` file for AI coding agents:

```bash
grafana-assistant agents-md <target-directory>
grafana-assistant agents-md <target-directory> --dry-run    # preview to stdout
grafana-assistant agents-md <target-directory> -o AGENTS.md  # custom output name
grafana-assistant agents-md <target-directory> --force        # overwrite existing
grafana-assistant agents-md <target-directory> --non-interactive  # skip prompts
```

## Assistant Tunnel

The tunnel allows Grafana Assistant to execute tools on your local machine.

```bash
grafana-assistant tunnel auth                    # authenticate (opens browser)
grafana-assistant tunnel connect                 # foreground connection (filesystem enabled by default)
grafana-assistant tunnel connect --all           # all authenticated instances
grafana-assistant tunnel connect --terminal      # enable terminal tool
```

### Daemon management

```bash
grafana-assistant tunnel daemon install          # install as system service
grafana-assistant tunnel daemon install --all    # connect all instances
grafana-assistant tunnel daemon install --start-on-login=false
grafana-assistant tunnel daemon start|stop|restart|status
grafana-assistant tunnel daemon logs [--follow]
grafana-assistant tunnel daemon uninstall
```

### Default security

**Filesystem:** read-only, project-scoped, blocks `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `**/.env`, `**/secrets.yaml`, `**/*.pem`, `**/*.key`. File size limit: 1MB.

**Terminal:** blocks dangerous commands (`rm -rf /`, `mkfs`, `dd`, fork bombs), minimal environment by default. Configurable via allow/deny lists in config.

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
