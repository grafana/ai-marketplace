# Add a plugin

Add a new plugin under `plugins/` and register it in both marketplace manifests.

## 1. Create plugin directory

Create a new folder:

```text
plugins/my-new-plugin/
```

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

## 2. Add plugin components

Add only the components you need. These are shared across both formats:

- `rules/` with `.mdc` files (YAML frontmatter required)
- `skills/<skill-name>/SKILL.md` (YAML frontmatter required)
- `agents/*.md` (YAML frontmatter required)
- `commands/*.(md|mdc|markdown|txt)` (frontmatter recommended)
- `hooks/hooks.json` and `scripts/*` for automation hooks
- `mcp.json` for MCP server definitions
- `assets/logo.svg` for marketplace display

## 3. Register in both marketplace manifests

Edit `.cursor-plugin/marketplace.json` **and** `.claude-plugin/marketplace.json`, appending a new entry to each:

```json
{
  "name": "my-new-plugin",
  "source": "plugins/my-new-plugin",
  "description": "Describe your plugin"
}
```

Use `plugins/my-new-plugin` as the source in the Cursor manifest and `./plugins/my-new-plugin` in the Claude Code manifest (with leading `./`).

## 4. Validate

```bash
node scripts/validate-template.mjs
```

The script validates both formats and checks cross-format consistency. Fix all reported errors before committing.

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
- Version mismatch between the two `plugin.json` files.
- Missing frontmatter keys (`name`, `description`) in skills, agents, or commands.
- Rule files missing frontmatter `description`.
- Broken relative paths for `logo`, `hooks`, or `mcpServers` in manifest files.
- Forgetting to update one of the two marketplace manifests.
