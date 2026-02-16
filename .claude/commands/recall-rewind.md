Recall the most recent rewind checkpoint from Memento: $ARGUMENTS

Follow the `session-management` skill for all rules and search patterns.

## Steps

1. **If $ARGUMENTS contains a rewind ID** — search for that exact ID:
   ```
   search_nodes  query: "REWIND_ID: {ID}"
   ```

2. **If no arguments** — find the most recent rewind:
   ```
   search_nodes  query: "STAKTRAKR rewind"
   ```
   Sort by TIMESTAMP, take the most recent.

3. **Open** the found entity with `open_nodes` and display:
   - Rewind ID and timestamp
   - What was accomplished (ABSTRACT)
   - Next action (NEXT)
   - Modified files (FILES)
   - Git state (BRANCH, COMMIT)
   - Active Linear issue (LINEAR)

4. **Verify freshness**: If the rewind is older than 24 hours, warn and suggest `/recall-handoff` or `/recall-session` for older context.

5. **If multiple rewinds found**, list them briefly:
   ```
   Recent rewinds:
     1. {ID} — {time} ago — {ABSTRACT}
     2. {ID} — {time} ago — {ABSTRACT}
   ```

Keep output minimal — this is a quick context reload, not a report.
