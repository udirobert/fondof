# fondof-compose

> Forge a personalised coding skill from a URL or a stated need, fitted to this repo.

## When to use

Use this when you want to turn a learning source (YouTube talk, blog post, podcast) or a concrete engineering need into a markdown skill file tailored to the current repository.

## How to call

Send a POST request to the fondof compose endpoint. It runs ingest → extract top shards → forge in one step.

### From a URL

```bash
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/compose \
  -H 'content-type: application/json' \
  -d '{
    "url": "<source URL>",
    "repo": "<owner>/<name>"
  }'
```

### From a stated need

```bash
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/compose \
  -H 'content-type: application/json' \
  -d '{
    "need": "<describe the problem or technique you want guidance on>",
    "repo": "<owner>/<name>"
  }'
```

The `repo` field accepts `"owner/name"`, a full GitHub URL, or an object `{"name": "...", "frameworks": [...], "languages": [...]}`. When given a ref or URL, the stack is auto-detected from the repo's package.json.

## Response

Returns JSON with these fields:

- `markdown` — the forged skill, ready to save
- `ideas` — the top shards that were used
- `skillHash` — unique id for the skill
- `skillUrl` — a shareable skill page (`https://fondof.netlify.app/s/{skillHash}`) when public sharing succeeded; null if the draft stayed private or the public record could not be stored
- `sourceUrl` — the original source
- `title` — skill title
- `fittedTo` — repo name it was fitted for
- `onChain` — whether the public artifact has an optional SkillPool attestation; false does not mean the skill is unusable

## What to do with the result

1. Read the `markdown` field.
2. Save it into this project so the agent can reference it:
   - Kiro: `.kiro/steering/<skill-name>.md`
   - Cursor: `.cursor/rules/<skill-name>.md`
   - Claude Code: append to `CLAUDE.md` or save as a standalone file
3. Keep the draft private or share `skillUrl` if others should see and re-forge it.
4. Use the skill's guidance on relevant tasks going forward; attach an outcome if it helped.
5. Attest through SkillPool only when portable provenance or contestable public quality matters.

## Notes

- The lifecycle is **private draft → explicit public share → optional attestation**. Compose is private by default; pass `"private": false` when the result should be publicly shareable.
- `topShards` (optional int, default 2, max 6) controls how many extracted ideas feed the forge. Add `"topShards": 3` to the body to change it.
- The endpoint is rate-limited (10/hour per IP). On a 429, wait and retry.
- If `ideas` comes back empty, the source could not be parsed — try a different URL or a more specific `need`.
