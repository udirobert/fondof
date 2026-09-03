# fondof — Agent guidance

fondof is a skill-forge: turn what you learn (articles, videos, docs) into repo-specific, shareable skills.

## Available WebMCP tools

All tools are registered at `/` and should be called from the user's active fondof tab.

### `search_skills`
Use this first when the user wants to know whether fondof already has a skill on a topic.
Requires a `query` from the user. Do not invent a query; ask if missing.

### `get_skill`
Use when the user references an existing fondof skill URL (`https://fondof.netlify.app/s/{hash}`) or a skill hash.
Requires `skill_hash`.

### `compose_skill`
Use when the user wants to create a new skill from a need (plain-text description) or one or more public source URLs.
- Pass **all** source URLs in a single `urls` array. Do not call `compose_skill` once per URL; the backend merges up to 4 sources into one skill.
- Provide exactly one of `need` or `urls` (or legacy `url`).
- Optional: `repo` for stack fitting and `top_shards` (1-6) for how many ideas to include.
- Optional: `private` (default `true`). Set `private: false` only when the user explicitly wants a public share and is signed in — this also unlocks unlimited forges for the month.
- Multi-source compose defaults to 3 shards; single-source defaults to 2.
- If the response contains `error` and `code: "quota_exceeded"`, stop and present `hint`, `unlock`, and `login_url` to the user. Do not retry silently.

## Attribution

`compose_skill` returns:
- `source_urls`: an array of every source URL that contributed to the skill.
- `source_title`: a combined title string.
- `markdown`: the skill body, which contains a `<!-- Sources: ... -->` comment and a References section.

When presenting a composed skill to the user, cite `source_urls` and mention `source_title`.
If `private` is true, `skill_url` will be null until the user explicitly shares the skill.

## Quotas and errors

Anonymous users have 10 free forges per month. If `compose_skill` returns a quota error, ask the user to sign in or share an existing public skill to unlock more forges.
