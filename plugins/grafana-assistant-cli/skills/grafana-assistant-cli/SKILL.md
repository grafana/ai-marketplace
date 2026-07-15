---
name: grafana-assistant-cli
description: Use an installed Grafana Assistant CLI for read-only observability investigations. Trigger when the user asks to investigate Grafana metrics, logs, traces, dashboards, incidents, or alert context through Grafana Assistant.
---

# Grafana Assistant CLI

Use this skill only for read-only investigations in a Grafana instance the user is authorized to access.

## Preconditions

1. Confirm the `grafana-assistant` binary is already available on `PATH`.
2. If the command is unavailable, direct the user to the [Grafana Assistant CLI installation instructions](https://github.com/grafana/assistant-cli). Do not install it automatically.
3. If authentication has not been completed, tell the user to run `grafana-assistant auth` themselves. Do not request, store, or pass service account tokens.

## Investigation workflow

1. Start with a focused read-only question that includes the service, time range, and signal to investigate.
2. Use `grafana-assistant prompt "<question>" --json` when structured output or a follow-up is useful.
3. For a follow-up, preserve the returned `contextId` and pass it with `-c <context-id>`.
4. State the evidence examined, findings, uncertainty, and recommended next diagnostic step.

Example:

```shell
grafana-assistant prompt "Investigate elevated checkout error rates in the last hour and summarize likely causes." --json
```

## Safety boundary

- Treat this plugin as read-only. Do not create or modify dashboards, alerts, incidents, annotations, or Grafana settings.
- Do not run `grafana-assistant tunnel`, tunnel daemon commands, or commands that grant Grafana Assistant filesystem or terminal access.
- Do not use token flags, edit CLI configuration files, or generate or overwrite `AGENTS.md` files.
- If a requested action requires a write operation or local-machine access, explain that this public plugin does not perform it and direct the user to Grafana's supported product workflow.
