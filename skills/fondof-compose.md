# fondof-compose

> Turn learning sources (YouTube, blog, docs) or a stated need into one fitted skill for this repo — then use it.

## When to use

The user wants a skill from what they learned (or a concrete need), fitted to the current codebase, and usually wants you to **apply that skill next**.

Prefer this over summarizing the source yourself.

## Hard rules (always)

1. **One compose call** — use `urls: [...]` or `fondof compose <url> <url2>`. Never one request per URL.
2. **Fail closed** — if the response is `402` / `quota_exceeded` / missing `markdown`: **stop**. Tell the user how to unlock (`fondof login`, `--share` after sign-in, or Pro). **Do not** invent, reconstruct, or paraphrase a skill from partial metadata. **Do not** retry in a loop.
3. **Auth** — anonymous is 10 forges/month per IP. Prefer `fondof login` (or `Authorization: Bearer` from `FONDOF_TOKEN`). `fondof connect` is GitHub-only and does **not** authenticate compose.

## User intent → your job

If they say something like:

> Use fondof to forge a video skill from \<youtube\> and \<blog\> for this repo, save it, then create the video following that skill.

Do exactly that in one pass. You already know the hard rules above — the user should not have to repeat them.

## Steps

1. **Resolve repo** — `git remote get-url origin` → `owner/name`. Omit `repo` only if that fails.
2. **Compose once** — prefer the CLI when available:
   ```bash
   fondof compose <url> [<url2>…] --repo owner/name -o <path>
   ```
   Or one POST (see API).
3. **Save** `markdown` (CLI `-o` does this):
   - Cursor: `.cursor/rules/<slug>.md`
   - Kiro: `.kiro/steering/<slug>.md`
   - Claude Code: skill file or `CLAUDE.md`
4. **Apply** — if they asked to do work next, follow the saved skill. Map craft onto **this repo’s stack**.

Unlimited forges: signed-in + share one public skill (`fondof compose … --share` / `"private": false`), or Pro.

## API

```bash
# Prefer multi-source in one call
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/compose \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $FONDOF_TOKEN" \
  -d '{
    "urls": ["<youtube-or-article>", "<optional-second>"],
    "repo": "<owner>/<name>"
  }'
```

Alternatives (mutually exclusive with `urls`): `"url": "<single>"` or `"need": "<problem>"`.

Optional: `"topShards": 3` (default 2 single / 3 multi, max 6). `"private": false` when they want a public share.

### Response

- `markdown` — required success signal; save this
- `title`, `skillHash`, `fittedTo`, `skillUrl`, `sourceUrls`
- `plan`, `remaining` — quota after this forge when present
- `sourceFailures` — partial multi-source ingest; continue only if `markdown` exists

### Errors

- `402` `quota_exceeded` — hard rule #2; read `unlock` + `error` in the body
- `429` — wait once, then retry
- `422` — try a clearer need or different URL
