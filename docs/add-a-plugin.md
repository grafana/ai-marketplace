# Add a plugin

Add a new plugin under `plugins/` with a `plugin.src.json` that lists the platforms it targets (Cursor, Claude Code, Kiro, Grok Build, and Codex). The generator writes its manifests and its entries in each platform's marketplace index.

## 1. Create plugin directory

Create a new folder:

```text
plugins/my-new-plugin/
```

### Source manifest (`plugin.src.json`)

The Cursor, Claude Code, and Codex manifests, the MCP configs, the `POWER.md` frontmatter, and the `plugins` list of every marketplace index are generated. Don't edit them by hand; write one source file instead:

```text
plugins/my-new-plugin/plugin.src.json
```

```json
{
  "name": "my-new-plugin",
  "displayName": "My New Plugin",
  "version": "0.1.0",
  "description": "Describe what this plugin does",
  "author": { "name": "Your Org" },
  "license": "Apache-2.0",
  "keywords": ["grafana"],
  "logo": "assets/logo.svg",
  "mcpServers": {
    "my-server": { "url": "https://example.com/mcp" }
  },
  "platforms": {
    "claude": {},
    "cursor": {},
    "kiro": {}
  }
}
```

- Shared fields (`name`, `displayName`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`) go into every generated manifest. `name` must match the directory.
- `platforms` lists the platforms to generate for; each one also gets an entry in that platform's marketplace index. Each value is merged over the shared fields for that platform's files only; set a field to `null` to leave it out. Supported keys:
  - `claude`: `.claude-plugin/plugin.json`
  - `cursor`: `.cursor-plugin/plugin.json`, plus `logo` and the MCP servers inline
  - `codex`: `.codex-plugin/plugin.json`; its `interface` gets `displayName` and `logo` filled in
  - `kiro`: `plugin.json` in the [Agent Plugins](https://agent-plugins.org) format, which Kiro's powers registry requires, and the frontmatter of `POWER.md` (`name`, `displayName`, `description`, `keywords`); the `POWER.md` body stays hand-written
  - `antigravity`: `.antigravity-plugin/plugin.json` (add up to 3 `suggestedPrompts`, and a 120–160 character `description`) and `mcp_config.json`. Antigravity only lists plugins from its curated marketplace, so there is no index entry
  - `grok`: no per-plugin file, only the marketplace entry
- `platforms.<platform>.marketplace` adds fields to that plugin's marketplace index entry, e.g. Codex's `policy` and `category`, or Grok's `category`, `homepage`, `keywords`, and `domains`. The entry's `description` is the platform's `description` (shared or overridden) unless `marketplace` sets one.
- `mcpServers` declares each server once, without a `type`: `url` for a hosted (Streamable HTTP) server, or `command`/`args`/`env` for a local one. The generator writes it in each platform's format: `"type": "http"` in `.mcp.json` (Claude Code, Codex), `"type": "streamable-http"` or `"stdio"` in the Agent Plugins `mcp.json` (Kiro), `serverUrl` in `mcp_config.json` (Antigravity), and inline in the Cursor manifest.
- `userConfig` (optional) is Claude Code's install-time prompt, with an extra `env` field per option naming the environment variable it stands for. `${GRAFANA_URL}` in a server's `env` becomes `${user_config.grafana_url}` in `.mcp.json`. It can't be combined with `codex` or `antigravity`.

Then generate:

```bash
node scripts/generate.mjs
```

For Codex, put the listing fields under `platforms.codex`. They usually include `mcpServers: "./.mcp.json"`, `skills: "./skills/"`, and an `interface` block (`shortDescription`, `longDescription`, `developerName`, `category`, `capabilities`, `websiteURL`, `privacyPolicyURL`, `termsOfServiceURL`, `defaultPrompt`, `brandColor`). See `plugins/grafana-cloud-mcp/plugin.src.json`.

### Kiro Power manifest

Add a `POWER.md` file with onboarding/steering instructions. Start it with an empty frontmatter block (`---` and `---` lines) and run the generator to fill it in from `plugin.src.json` and `platforms.kiro`:

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
- MCP server definitions go in `plugin.src.json` (generated into `mcp.json` and `.mcp.json`)
- `assets/logo.svg` for marketplace display

Kiro-specific additions:

- `POWER.md` — required for Kiro (replaces `plugin.json` as the manifest)
- `steering/*.md` — optional workflow-specific guidance files referenced from `POWER.md`

## 3. Marketplace indexes

The `plugins` list in each marketplace index is generated from the `platforms` in every `plugin.src.json`, sorted by plugin name:

- `.cursor-plugin/marketplace.json` (Cursor)
- `.claude-plugin/marketplace.json` (Claude Code)
- `.kiro-power/marketplace.json` (Kiro)
- `.grok-plugin/marketplace.json` (Grok Build)
- `.agents/plugins/marketplace.json` (Codex)

Only the top-level fields (`name`, `owner`, `metadata`, and so on) are hand-written. A Codex entry needs `policy` and `category` in `platforms.codex.marketplace`:

```json
"codex": {
  "marketplace": {
    "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
    "category": "Productivity"
  }
}
```

## 4. Validate

```bash
node scripts/generate.mjs --check
node scripts/validate-template.mjs
```

`--check` fails if a generated file doesn't match its `plugin.src.json`; CI runs it too.

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
- Editing a generated manifest or MCP config instead of `plugin.src.json`.
- Missing `POWER.md` in plugin folder (required for Kiro).
- Forgetting to run `node scripts/generate.mjs` after editing `plugin.src.json`.
- Missing frontmatter keys (`name`, `description`) in skills, agents, or commands.
- Rule files missing frontmatter `description`.
- Broken relative paths for `logo`, `hooks`, or `mcpServers` in manifest files.
- Editing a marketplace index's `plugins` list or `POWER.md` frontmatter by hand.
- Hand-writing a file at a generated path (such as a root `plugin.json` or `mcp_config.json`) in a plugin that doesn't target that platform; the generator removes it.
