# PR Resolve — StackTrackr

Review, reply to, and resolve all PR review comments. Designed for Copilot, Codacy, and human reviewer comments.

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
  repository(owner: "lbruton", name: "StackTrackr") {
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

### Step 3: Summarize findings

Present a table of unresolved threads:

```
PR #XX — Title
==============
Unresolved threads: N

 #  | File:Line        | Author  | Summary
 1  | sw.js:163        | copilot | networkFirst resolves undefined
 2  | sw.js:157        | copilot | cacheFirst catch can reject
 ...

Proceed to review each? [Yes / Skip specific threads]
```

Wait for user confirmation before proceeding.

## Phase 2: Triage

For each unresolved thread, read the relevant code context and classify it:

### Classification labels

| Label | Meaning | Action |
|-------|---------|--------|
| **Resolved** | Already fixed in a subsequent commit | Reply with commit SHA + explanation, resolve thread |
| **Fix now** | Valid concern, will fix immediately | Make the fix, commit, reply with commit SHA, resolve thread |
| **Deferred** | Valid but out of scope for this PR | Reply noting deferral + create a Linear issue or TODO, resolve thread |
| **False positive** | Not applicable or incorrect suggestion | Reply with rationale explaining why, resolve thread |
| **Acknowledged** | Valid observation, addressed at a different level | Reply explaining the alternative approach taken, resolve thread |
| **Won't fix** | Disagree with the suggestion | Reply with technical justification, resolve thread |

Present the classification to the user before acting:

```
Thread #1 — sw.js:163 (copilot)
  "networkFirst resolves undefined..."
  Classification: Resolved ✓
  Proposed reply: Fixed in 1b95511 — now terminates with Response.error()

Thread #2 — sw.js:157 (copilot)
  "cacheFirst catch can reject..."
  Classification: Fix now
  Proposed fix: Add terminal .catch(() => Response.error())

Approve all? [Go / Adjust #N / Skip #N]
```

Wait for user confirmation. User may adjust classifications or skip threads.

## Phase 3: Execute

For each approved thread, in order:

### For "Fix now" threads

1. Read the file and understand the context
2. Make the code fix using Edit tool
3. Run `node -c <file>` to syntax-check
4. Stage and commit:
   ```bash
   git add <file>
   git commit -m "fix: <description> (PR #XX review)"
   ```
5. Continue to next thread (push once at the end)

### For all threads (after fixes are committed)

1. Push all fix commits:
   ```bash
   git push origin <branch>
   ```

2. Reply to each thread with the appropriate response format:

   **Resolved:**
   ```
   **Resolved in** `<commit SHA>`

   <What was changed and why>
   ```

   **Fix now:**
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

3. Reply using the GitHub API:
   ```bash
   gh api repos/lbruton/StackTrackr/pulls/PR_NUMBER/comments/COMMENT_ID/replies \
     -f body="REPLY_TEXT"
   ```

4. Resolve the thread using GraphQL:
   ```bash
   gh api graphql -f query='
     mutation {
       resolveReviewThread(input: {threadId: "THREAD_NODE_ID"}) {
         thread { isResolved }
       }
     }'
   ```

## Phase 4: Verify

After all threads are processed:

1. Confirm zero unresolved threads:
   ```bash
   gh api graphql -f query='
   {
     repository(owner: "lbruton", name: "StackTrackr") {
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

2. Report summary:

```
PR #XX — All threads resolved
==============================
 Total threads:    N
 Resolved:         X (already fixed)
 Fixed now:        Y (new commits)
 Deferred:         Z (tracked in Linear)
 False positive:   W
 Acknowledged:     V

Commits pushed: [list of SHAs]
Unresolved remaining: 0

Ready for merge (pending CI checks).
```

## Important Notes

- **Never resolve without replying.** Every thread must have a reply explaining the disposition, even if it's just "Fixed in `abc123`". This creates an audit trail.
- **Batch fixes into logical commits.** If multiple threads point to the same file/concern, combine them into a single fix commit rather than one commit per thread.
- **Don't force-resolve disagreements.** If a human reviewer (not a bot) left a comment and the classification is "Won't fix", flag it for the user rather than auto-resolving. Bots (copilot, codacy) can be auto-resolved after reply.
- **Check for new threads after pushing.** Pushing fix commits may trigger a new Copilot review. If new threads appear, run Phase 1 again.
- **Respect review re-requests.** If the PR has a "Changes requested" review status, resolving threads alone won't clear it — the reviewer needs to re-approve. Note this in the summary if applicable.
