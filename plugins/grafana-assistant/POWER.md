---
name: "grafana-assistant"
displayName: "Grafana Assistant"
description: "Skills and rules for developing and using the Grafana Assistant app and CLI — query metrics, logs, traces, and run AI-assisted observability investigations via the A2A API"
keywords: ["grafana", "assistant", "a2a", "cli", "observability", "investigation", "metrics", "logs", "traces"]
---

# Grafana Assistant

Skills and guidance for using the `grafana-assistant` CLI to interact with Grafana Assistant via the A2A API. Covers installation, configuration, prompting, conversation context management, and practical patterns for ops investigations.

> **Note:** This power does not add MCP tools — it provides workflows and best practices for using the Grafana Assistant CLI from within Kiro. For direct MCP tool access, install the **grafana-mcp** power instead.

## Onboarding

### Step 1: Validate the CLI is installed

The `grafana-assistant` binary must be available on `$PATH`. Verify:

```bash
grafana-assistant --version
```

**CRITICAL:** If the command is not found, stop and tell the user to install it first.

Installation instructions and pre-built binaries: [github.com/grafana/assistant-cli](https://github.com/grafana/assistant-cli)

A Docker image is also available: [github.com/grafana/assistant-cli/pkgs](https://github.com/grafana/assistant-cli/pkgs)

### Step 2: Configure a Grafana instance

Quick setup:

```bash
grafana-assistant config set-instance mystack --url https://mystack.grafana.net
grafana-assistant config use-instance mystack
grafana-assistant auth        # opens browser for PKCE auth
grafana-assistant chat        # verify with interactive chat
```

The **Assistant CLI User** role is required for browser auth. Users with **Editor** role or above get this automatically.

## When to Load Steering Files

- Using `grafana-assistant prompt` or `grafana-assistant chat` → `grafana-assistant-cli.md`
- Configuring instances, tokens, or projects → `grafana-assistant-cli.md`
- Running multi-step investigations or keeping conversation context → `grafana-assistant-cli.md`
- Using the assistant tunnel for local tool access → `grafana-assistant-cli.md`
- Generating `AGENTS.md` for AI coding agents → `grafana-assistant-cli.md`
