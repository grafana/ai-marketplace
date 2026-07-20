# Add a plugin

Add a new plugin under `plugins/` and register it in all applicable marketplace formats (Cursor, Claude Code, Kiro, Grok Build, and Codex). A plugin only needs manifests for the platforms it targets.

## 1. Create plugin directory

Create a new folder:

```text
plugins/my-new-plugin/
```

### Cursor + Claude Code manifests

Add the required manifests for both formats:

```text
plugins/my-new-plugin/.cursor-plugin/plugin.json
plugins/my-new-plugin/.claude-plugin/plugin.json
```

Both manifests use the same schema. Example:

```json
{
  "name": "my-new-plugin",
  "displayName": "My New Plugin",
  "version": "0.1.0",
  "description": "Describe what this plugin does",
  "author": {
    "name": "Your Org"
  },
  "logo": "assets/logo.svg"
}
```

Keep the two `plugin.json` files identical — the validation script will flag version mismatches.

### Codex manifest

For Codex, add a `.codex-plugin/plugin.json`:

```text
plugins/my-new-plugin/.codex-plugin/plugin.json
```

It uses the base plugin fields plus an `interface` block for the public listing, and may declare `mcpServers` and/or `skills`:

```json
{
  "name": "my-new-plugin",
  "version": "0.1.0",
  "description": "Describe what this plugin does",
  "author": { "name": "Your Org" },
  "license": "Apache-2.0",
  "mcpServers": "./.mcp.json",
  "skills": "./skills/",
  "interface": {
    "displayName": "My New Plugin",
    "logo": "./assets/logo.svg",
    "shortDescription": "One line for the listing",
    "longDescription": "Full listing description",
    "developerName": "Your Org",
    "category": "Productivity",
    "capabilities": ["Interactive"],
    "websiteURL": "https://example.com",
    "privacyPolicyURL": "https://example.com/privacy",
    "termsOfServiceURL": "https://example.com/terms"
  }
}
```

For a hosted (Streamable HTTP) MCP server, point `mcpServers` at a `.mcp.json` with an `http` server entry rather than a local Docker command.

### Kiro Power manifest

Add a `POWER.md` file with YAML frontmatter and onboarding/steering instructions:

```text
plugins/my-new-plugin/POWER.md
```

Example:

```markdown
---
name: "my-new-plugin"
displayName: "My New Plugin"
description: "Describe what this plugin does"
keywords: ["keyword1", "keyword2"]
---

# My New Plugin

Brief description of what this power provides.

## Onboarding

### Step 1: Validate dependencies
...

## When to Load Steering Files

- Doing X → `my-workflow.md`
```

The frontmatter `name` must match the plugin name. Kiro activates the power when a user's message matches any of the `keywords`.

For complex plugins, add a `steering/` directory alongside `POWER.md` for workflow-specific guidance files referenced from `POWER.md`.

## 2. Add plugin components

Add only the components you need. These are shared across all formats:

- `rules/` with `.mdc` files (YAML frontmatter required)
- `skills/<skill-name>/SKILL.md` (YAML frontmatter required)
- `agents/*.md` (YAML frontmatter required)
- `commands/*.(md|mdc|markdown|txt)` (frontmatter recommended)
- `hooks/hooks.json` and `scripts/*` for automation hooks
- `mcp.json` for MCP server definitions
- `assets/logo.svg` for marketplace display

Kiro-specific additions:

- `POWER.md` — required for Kiro (replaces `plugin.json` as the manifest)
- `steering/*.md` — optional workflow-specific guidance files referenced from `POWER.md`

## 3. Register in the applicable marketplace formats

Append a new entry to each marketplace manifest for the platforms your plugin targets:

- `.cursor-plugin/marketplace.json` (Cursor)
- `.claude-plugin/marketplace.json` (Claude Code)
- `.kiro-power/marketplace.json` (Kiro)
- `.grok-plugin/marketplace.json` (Grok Build)
- `.agents/plugins/marketplace.json` (Codex)

For Cursor, Claude Code, and Kiro:

```json
{
  "name": "my-new-plugin",
  "source": "plugins/my-new-plugin",
  "description": "Describe your plugin"
}
```

Use `plugins/my-new-plugin` as the source in the Cursor and Kiro manifests, and `./plugins/my-new-plugin` in the Claude Code manifest (with leading `./`). Grok uses its own entry shape (`source.type` / `source.path`, plus `category`, `keywords`, and `domains`).

For Codex, register the plugin in `.agents/plugins/marketplace.json`:

```json
{
  "name": "my-new-plugin",
  "source": { "source": "local", "path": "./plugins/my-new-plugin" },
  "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
  "category": "Productivity"
}
```

## 4. Validate

```bash
node scripts/validate-template.mjs
```

The script validates the Cursor, Claude Code, Kiro, and Codex formats and checks cross-format consistency. For Codex it parses `.agents/plugins/marketplace.json`, checks each entry's required `policy`/`category` fields and safe relative `source.path`, and validates the referenced `.codex-plugin/plugin.json`, its declared `.mcp.json`, and any `skills/*/SKILL.md` frontmatter. Fix all reported errors before committing.

## 5. Test in Claude Code

From any Claude Code session, add (or refresh) the marketplace from GitHub:

```shell
/plugin marketplace add grafana/ai-marketplace
/plugin marketplace update grafana-ai-marketplace
```

Install your new plugin from the marketplace:

```shell
/plugin install my-new-plugin@grafana-ai-marketplace
```

If it was already installed, reinstall to pick up local changes:

```shell
/plugin uninstall my-new-plugin@grafana-ai-marketplace
/plugin install my-new-plugin@grafana-ai-marketplace
```

## 6. Common pitfalls

- Plugin `name` not kebab-case.
- `source` path in marketplace manifest does not match folder name.
- Missing `.cursor-plugin/plugin.json` or `.claude-plugin/plugin.json` in plugin folder.
- Missing `POWER.md` in plugin folder (required for Kiro).
- Version mismatch between the two `plugin.json` files.
- `name` in `POWER.md` frontmatter does not match the marketplace entry name.
- Missing frontmatter keys (`name`, `description`) in skills, agents, or commands.
- Rule files missing frontmatter `description`.
- Broken relative paths for `logo`, `hooks`, or `mcpServers` in manifest files.
- Forgetting to update one of the applicable marketplace manifests.
