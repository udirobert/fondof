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
    "repo": {
      "name": "<this repo name>",
      "frameworks": ["<framework1>", "<framework2>"],
      "languages": ["<language1>"]
    }
  }'
```

### From a stated need

```bash
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/compose \
  -H 'content-type: application/json' \
  -d '{
    "need": "<describe the problem or technique you want guidance on>",
    "repo": {
      "name": "<this repo name>",
      "frameworks": ["<framework1>"],
      "languages": ["<language1>"]
    }
  }'
```

## Response

Returns JSON with these fields:

- `markdown` — the forged skill, ready to save
- `ideas` — the top shards that were used
- `skillHash` — unique id for the skill
- `sourceUrl` — the original source
- `title` — skill title
- `fittedTo` — repo name it was fitted for

## What to do with the result

1. Read the `markdown` field.
2. Save it into this project so the agent can reference it:
   - Kiro: `.kiro/steering/<skill-name>.md`
   - Cursor: `.cursor/rules/<skill-name>.md`
   - Claude Code: append to `CLAUDE.md` or save as a standalone file
3. Use the skill's guidance on relevant tasks going forward.

## Notes

- `topShards` (optional int, default 2, max 6) controls how many extracted ideas feed the forge. Add `"topShards": 3` to the body to change it.
- The endpoint is rate-limited. On a 429, wait and retry.
- If `ideas` comes back empty, the source could not be parsed — try a different URL or a more specific `need`.
