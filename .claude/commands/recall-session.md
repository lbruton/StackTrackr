Recall recent session context from Memento: $ARGUMENTS

Follow the `session-management` skill for all rules and search patterns.

## Steps

1. **If $ARGUMENTS contains a session ID** — search for that exact ID:
   ```
   search_nodes  query: "SESSION_ID: {ID}"
   ```

2. **If $ARGUMENTS contains a keyword** — semantic search:
   ```
   semantic_search  query: "staktrakr session {keyword}"
     limit: 5, min_similarity: 0.4
   ```

3. **If no arguments** — find the most recent session:
   ```
   search_nodes  query: "STAKTRAKR session"
   ```
   Sort by TIMESTAMP, take the most recent.

4. **Open** the found entity with `open_nodes` and display:
   - Session ID and date
   - Abstract (what was accomplished)
   - Insights (the most valuable part)
   - Decisions made
   - Files modified

5. **If multiple sessions found**, list them briefly and let the user pick, or default to the most recent.

Keep output concise — the user wants context, not a transcript.
