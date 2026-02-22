# mem0 — Conversational Memory Stack

Automatic episodic memory for Claude Code sessions. Pairs with Memento (structured knowledge graph) for complete memory coverage.

## Start

```bash
# Copy env template and fill from Infisical
cp .env.example .env
# Get OPENROUTER_API_KEY from Infisical (http://localhost:8700)

docker compose up -d
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| mem0 server | 8888 | Memory API + MCP endpoint |
| Qdrant | 6333 | Vector storage (HTTP) |
| Qdrant | 6334 | Vector storage (gRPC) |

## MCP Configuration

Add to `.mcp.json`:

```json
"mem0": {
  "type": "http",
  "url": "http://localhost:8888/mcp"
}
```

## mem0 vs Memento

Short version:

- **mem0**: automatic, conversational, "what were we doing last session?"
- **Memento**: explicit, structured, "save this architectural decision"

Use both together — mem0 captures session flow automatically; Memento stores durable insights you explicitly want to persist.
