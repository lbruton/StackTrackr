# PR Resolve — StakTrakr

Review, reply to, and resolve all PR review comments and CI check failures. Handles Copilot review threads, Codacy quality gate findings, and human reviewer comments in a single pass.

## Arguments

`/pr-resolve` accepts:

- `<PR number>` — resolve comments on a specific PR (e.g., `/pr-resolve 136`)
- No argument — auto-detect the open PR for the current branch

## Phase 1: Discover

### Step 1: Identify the PR

If no PR number provided, detect from current branch:
```bash
gh pr view --json number,title,url --jq '"\(.number) | \(.title) | \(.url)"'
```

### Step 2: Fetch all unresolved review threads

Use GraphQL to get threads with full context:
```bash
gh api graphql -f query='
{
  repository(owner: "lbruton", name: "StakTrakr") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 10) {
            nodes {
              databaseId
              author { login }
              body
              path
              line
              originalLine
              createdAt
            }
          }
        }
      }
    }
  }
}'
```

### Step 3: Check Codacy status

Fetch PR check status to see if Codacy passed or failed:
```bash
gh pr checks PR_NUMBER --json name,state,description --jq '.[] | select(.name | test("codacy|Codacy"; "i"))'
```

If Codacy failed or reported issues:

1. **Check Codacy PR comments** — Codacy sometimes leaves inline comments:
   ```bash
   gh api repos/lbruton/StakTrakr/pulls/PR_NUMBER/comments --jq '.[] | select(.user.login | test("codacy"; "i")) | "\(.id) | \(.path):\(.line) | \(.body)"'
   ```

2. **Fetch Codacy PR findings via MCP** — use the Codacy MCP tools for detailed analysis:
   ```
   mcp__codacy__codacy_list_pull_request_issues  (provider: "gh", owner: "lbruton", repo: "StakTrakr", pullRequestNumber: PR_NUMBER)
   ```

3. **Cross-reference with Codacy dashboard** — for pattern-level details:
   ```
   mcp__codacy__codacy_get_repository_with_analysis  (provider: "gh", owner: "lbruton", repo: "StakTrakr")
   ```

### Step 4: Summarize all findings

Present a unified table of issues from all sources:

```
PR #XX — Title
==============

Review Threads (Copilot/Human): N unresolved
 #  | File:Line        | Author  | Summary
 1  | sw.js:163        | copilot | networkFirst resolves undefined
 2  | sw.js:157        | copilot | cacheFirst catch can reject

Codacy Quality Gate: PASS / FAIL
 #  | File:Line        | Category    | Summary
 C1 | events.js:245    | Complexity  | Function exceeds CCN threshold (15 > 10)
 C2 | utils.js:89      | Duplication | 12-line clone of utils.js:340

Proceed to review each? [Yes / Skip specific items]
```

Wait for user confirmation before proceeding.

## Phase 2: Triage

For each unresolved issue (review threads AND Codacy findings), read the relevant code context and classify it:

### Classification labels

| Label | Meaning | Action |
|-------|---------|--------|
| **Resolved** | Already fixed in a subsequent commit | Reply with commit SHA + explanation, resolve thread |
| **Fix now** | Valid concern, will fix immediately | Make the fix, commit, reply with commit SHA, resolve thread |
| **Deferred** | Valid but out of scope for this PR | Reply noting deferral + create a Linear issue or TODO, resolve thread |
| **False positive** | Not applicable or incorrect suggestion | Reply with rationale explaining why, resolve thread |
| **Acknowledged** | Valid observation, addressed at a different level | Reply explaining the alternative approach taken, resolve thread |
| **Won't fix** | Disagree with the suggestion | Reply with technical justification, resolve thread |
| **Pre-existing** | Codacy flagged code that wasn't changed in this PR | Note in summary, do not fix (avoid scope creep) |

### Codacy-specific triage rules

- **Complexity**: If the function was modified in this PR, fix it. If it's pre-existing complexity on untouched code, classify as **Pre-existing** and optionally note for a future cleanup PR.
- **Duplication**: If the duplication was introduced in this PR, extract a helper. If pre-existing, classify as **Pre-existing**.
- **Security**: Always classify as **Fix now** regardless of whether the code is new or pre-existing — security issues don't get deferred.
- **Code style / patterns**: Fix if trivial (< 5 min), defer if substantial.

Present the classification to the user before acting:

```
Thread #1 — sw.js:163 (copilot)
  "networkFirst resolves undefined..."
  Classification: Resolved ✓
  Proposed reply: Fixed in 1b95511 — now terminates with Response.error()

Codacy C1 — events.js:245 (complexity)
  "Function handleSubmit exceeds CCN threshold"
  Classification: Pre-existing (function not modified in this PR)

Approve all? [Go / Adjust #N / Skip #N]
```

Wait for user confirmation. User may adjust classifications or skip items.

## Phase 3: Execute

### Step 1: Fix code issues

For each "Fix now" item (both review threads and Codacy findings), in order:

1. Read the file and understand the context
2. Make the code fix using Edit tool
3. Run `node -c <file>` to syntax-check
4. Continue to next item (stage all at the end)

**Batch fixes into logical commits.** Group related fixes:

- All Copilot review fixes for the same file → one commit
- All Codacy fixes for the same category → one commit
- Don't mix Copilot and Codacy fixes in the same commit (makes the audit trail clearer)

Commit message formats:
```bash
# For Copilot/human review fixes
git commit -m "fix: <description> (PR #XX review)"

# For Codacy quality fixes
git commit -m "fix: <description> (Codacy)"
```

### Step 2: Push all fix commits

```bash
git push origin <branch>
```

### Step 3: Reply to and resolve review threads

For each Copilot/human review thread, reply with the appropriate format:

**Resolved:**
```
**Resolved in** `<commit SHA>`

<What was changed and why>
```

**Fixed in this pass:**
```
**Fixed in** `<commit SHA>`

<What was changed and why>
```

**Deferred:**
```
**Deferred to future patch**

Valid concern. <Brief acknowledgment>. Tracked as [STACK-XX](link) for a future release.
```

**False positive:**
```
**False positive — no change needed**

<Technical explanation of why this isn't an issue>
```

**Acknowledged:**
```
**Acknowledged — <alternative approach taken>**

<Explanation of the approach and why it addresses the concern>
```

**Won't fix:**
```
**Won't fix**

<Technical justification>
```

Reply using the GitHub API:
```bash
gh api repos/lbruton/StakTrakr/pulls/PR_NUMBER/comments/COMMENT_ID/replies \
  -f body="REPLY_TEXT"
```

Resolve the thread using GraphQL:
```bash
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "THREAD_NODE_ID"}) {
      thread { isResolved }
    }
  }'
```

### Step 4: Comment on Codacy fixes

If Codacy issues were fixed, leave a single summary comment on the PR (not per-finding):
```bash
gh pr comment PR_NUMBER --body "$(cat <<'EOF'
## Codacy Fixes

- **Complexity**: Extracted `handleFoo` helper to reduce CCN in `events.js:handleSubmit` (`abc1234`)
- **Duplication**: Merged shared logic into `buildFields` helper (`def5678`)

Pre-existing issues (not addressed in this PR):
- `filters.js:120` — CCN 12 (function not modified in this PR)

Codacy will re-scan on next push.
EOF
)"
```

## Phase 4: Verify

After all fixes are pushed, wait for CI to re-run, then verify:

### Step 1: Check review threads

```bash
gh api graphql -f query='
{
  repository(owner: "lbruton", name: "StakTrakr") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 50) {
        nodes {
          isResolved
        }
      }
    }
  }
}' --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length'
```

### Step 2: Check Codacy status

```bash
gh pr checks PR_NUMBER --json name,state --jq '.[] | select(.name | test("codacy|Codacy"; "i"))'
```

If Codacy is still pending, note it in the summary. If it failed again, run Phase 1 again for the new findings only.

### Step 3: Check for new Copilot threads

Pushing fix commits may trigger a new Copilot review. If new unresolved threads appear, loop back to Phase 1 for the new threads only.

### Step 4: Report summary

```
PR #XX — Resolution Summary
=============================

Review Threads
 Total:          N
 Fixed:          X (new commits)
 Resolved:       Y (already addressed)
 False positive:  Z
 Deferred:       W (tracked in Linear)

Codacy Quality Gate
 Status:         PASS ✓ / PENDING ⏳ / FAIL ✗
 Fixed:          X findings
 Pre-existing:   Y (not in scope)

Commits pushed: [list of SHAs]
Unresolved threads: 0

Ready for merge.
```

## Important Notes

- **Never resolve without replying.** Every thread must have a reply explaining the disposition, even if it's just "Fixed in `abc123`". This creates an audit trail.
- **Batch fixes into logical commits.** If multiple threads point to the same file/concern, combine them into a single fix commit rather than one commit per thread.
- **Don't force-resolve disagreements.** If a human reviewer (not a bot) left a comment and the classification is "Won't fix", flag it for the user rather than auto-resolving. Bots (copilot, codacy) can be auto-resolved after reply.
- **Check for new threads after pushing.** Pushing fix commits may trigger a new Copilot review. If new threads appear, run Phase 1 again for new threads only.
- **Respect review re-requests.** If the PR has a "Changes requested" review status, resolving threads alone won't clear it — the reviewer needs to re-approve. Note this in the summary if applicable.
- **Codacy re-scans automatically.** Unlike Copilot threads which need manual resolution, Codacy re-evaluates on each push. If your fixes are correct, the quality gate will flip to PASS without additional action.
- **Don't fix pre-existing Codacy issues in release PRs.** Scope creep on a release PR risks introducing regressions. Note pre-existing issues and address them in a dedicated cleanup PR if needed.
- **Security findings are never "pre-existing."** If Codacy flags a security issue, fix it regardless of whether the code was modified in this PR.
