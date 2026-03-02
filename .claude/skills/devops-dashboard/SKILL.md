---
name: devops-dashboard
description: Use when modifying the spec-workflow MCP plugin — templates, dashboard UI, MCP tools, build, or configuration. Also use for any devops dashboard/tooling work tracked under the DevOps Linear team. Triggers on mentions of spec-workflow plugin, dashboard customization, template edits, MCP tool changes, or devops tooling.
---

# DevOps Dashboard — Spec-Workflow Plugin

Local fork of `@pimzino/spec-workflow-mcp` with dashboard + custom templates.

## Linear Team

**DevOps** — `38d57c9f-388c-41ec-9cd2-259a21a5df1c`
All dashboard/tooling/infra issues go here.

## Plugin Location

```
~/.claude/plugins/marketplaces/spec-workflow-mcp-marketplace/
```

## Key Paths

| What | Path (relative to plugin root) |
|------|------|
| **MCP entry point** | `src/index.ts` → `dist/index.js` |
| **MCP server class** | `src/server.ts` |
| **MCP tools** | `src/tools/` (5 tools: spec-workflow-guide, steering-guide, spec-status, approvals, log-implementation) |
| **Markdown templates** | `src/markdown/templates/` (requirements, design, tasks, product, tech, structure) |
| **Dashboard backend** | `src/dashboard/multi-server.ts` (Fastify on port 5000) |
| **Dashboard frontend** | `src/dashboard_frontend/` (React 18 + Vite + Tailwind v4) |
| **Frontend entry** | `src/dashboard_frontend/src/main.tsx` |
| **Frontend components** | `src/dashboard_frontend/src/modules/` |
| **i18n locales** | `src/dashboard_frontend/src/locales/` (13 languages) |
| **Post-build copier** | `scripts/copy-static.cjs` |
| **Plugin manifests** | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| **Built output** | `dist/` (compiled TS + React build + templates + locales) |

## Build Commands

```bash
cd ~/.claude/plugins/marketplaces/spec-workflow-mcp-marketplace

# Full production build (validates i18n → compiles TS → builds React → copies static)
npm run build

# Dev mode — dashboard frontend with HMR (port 5173, proxies API to 5000)
npm run dev:dashboard

# Dev mode — MCP server via tsx (no compilation)
npm run dev

# Start compiled server
npm run start
```

## Template System

Templates live in `src/markdown/templates/`. After `npm run build`, they're copied to `dist/markdown/templates/` with LF normalization.

At MCP server startup, `WorkspaceInitializer` copies them to `.spec-workflow/templates/` in the project workspace. Users can override via `.spec-workflow/user-templates/`.

**Template priority:** user-templates/ > templates/ (defaults)

## Dashboard Architecture

- **Backend:** Fastify on `127.0.0.1:5000` (localhost only by default)
- **Frontend:** React 18 + HashRouter + Tailwind v4 + MDX Editor
- **Real-time:** WebSocket at `/ws` for spec change broadcasts
- **API:** REST at `/api/*` (projects, specs, approvals, implementation logs)
- **Session:** Tracked in `~/.spec-workflow-mcp/session.json`
- **Project registry:** `~/.spec-workflow-mcp/projects.json`

## MCP Server Registration

All three agents run the local fork (not the npm package):

| Agent | Config file | Command |
|-------|------------|---------|
| **Claude Code** | Plugin auto-registered via `.claude-plugin/with-dashboard/.mcp.json` | `node dist/index.js .` |
| **Gemini** | `~/.gemini/settings.json` | `node dist/index.js /Volumes/DATA/GitHub/StakTrakr` |
| **Codex** | `~/.codex/config.toml` | `node dist/index.js /Volumes/DATA/GitHub/StakTrakr` |

## Workflow for Making Changes

1. Create a Linear issue in the **DevOps** team
2. Edit source files in `src/` (never edit `dist/` directly)
3. Run `npm run build` from the plugin root
4. Restart Claude Code session to reload the MCP server
5. Test: create a spec or open dashboard at `http://localhost:5000`

## Common Tasks

### Edit a template
1. Modify `src/markdown/templates/{name}-template.md`
2. `npm run build`
3. Restart session — new specs will use the updated template

### Edit dashboard UI
1. Run `npm run dev:dashboard` for HMR (port 5173)
2. Edit components in `src/dashboard_frontend/src/modules/`
3. When done: `npm run build` to compile for production

### Add/modify an MCP tool
1. Edit or create in `src/tools/`
2. Register in `src/tools/index.ts`
3. `npm run build`
4. Restart session

### Add a locale
1. Add JSON file in `src/dashboard_frontend/src/locales/`
2. Update `src/dashboard_frontend/src/i18n.ts`
3. `npm run build` (i18n validation runs first)
