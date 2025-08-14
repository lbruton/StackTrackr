# Human Developer Workflow

This guide summarizes the typical tools and branch strategy for human contributors to StackrTrackr.

**Current Release:** v3.04.42

## Tools

### Sublime Text & GitHub Desktop (macOS)
- Edit repository files locally with **Sublime Text**.
- Use the **GitHub Desktop app** on macOS to stage, commit, and sync changes.

### Claude.ai Local Folder Access
- Utilize **Claude.ai's local file access** to browse documentation or code for quick references.

### OpenAI Codex Integration
- **Codex** connects directly to the main repository when deeper code generation or analysis is required.

## Branch Usage

- **`main`** – primary development branch containing the latest features.
- **`cloudflare`** – deployment branch tuned for Cloudflare hosting.
- **`release_v*`** – versioned release branches (e.g., `release_v3.03.02a`).

## Hosting URLs

- **Production**: [https://stackrtrackr.com](https://stackrtrackr.com)
- **Cloudflare Preview**: [https://stackrtrackr.pages.dev](https://stackrtrackr.pages.dev) *(used for Cloudflare deployments)*
- **Source Repository**: [https://github.com/lbruton/StackTrackr](https://github.com/lbruton/StackTrackr)

For overall development workflow, see [docs/MULTI_AGENT_WORKFLOW.md](MULTI_AGENT_WORKFLOW.md).
