Recall a development handoff from Memento: $ARGUMENTS

Follow the `session-management` skill for all rules and search patterns.

## Steps

1. **If $ARGUMENTS contains a handoff ID** — search for that exact ID:
   ```
   search_nodes  query: "HANDOFF_ID: {ID}"
   ```

2. **If $ARGUMENTS is empty or "recent"** — find the most recent handoff:
   ```
   search_nodes  query: "STAKTRAKR handoff"
   ```
   Sort by TIMESTAMP, take the most recent.

3. **If $ARGUMENTS contains a keyword** — semantic search:
   ```
   semantic_search  query: "staktrakr handoff {keyword}"
     limit: 5, min_similarity: 0.4
   ```

4. **Open** the found entity with `open_nodes` and display:
   - Handoff ID and date
   - Abstract
   - Next steps (most important — this is why handoffs exist)
   - Active Linear project and issues
   - Blockers
   - Key insights and decisions

5. **Verify freshness**: If the handoff is older than 7 days, warn that context may be stale and suggest checking git log and Linear directly.

Keep output concise and action-oriented — focus on NEXT_STEPS.
