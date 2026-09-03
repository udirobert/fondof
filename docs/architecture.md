# Package roles

Short map so contributors don't conflate edges. Full product story: [docs/project-guide.md](project-guide.md). Steering: [`.kiro/steering/project.md`](../.kiro/steering/project.md). Hackathon content plan: [submission-plan.md](submission-plan.md). Video production: [video-pipeline.md](video-pipeline.md). Future-of-data-layer note: [Arkiv roadmap item](roadmap-arkiv.md) — eval only, not shipped.

**Product hierarchy:** Need/source → extract → fit/forge → copy/use → outcome → share/attribute → optional SkillPool proof. Not a marketplace, generic registry, or AI security scanner.

**Boundary:** offchain for usefulness; onchain for public trust. SkillPool is downstream of the craft loop and should never be required for ordinary forging, hand-off, or outcome capture.

| Package | Owns | Does not own |
|---------|------|----------------|
| **web** | Judge UI, forge craft, SkillPool desk, `/u/[login]` portfolio, `/from/[source]` creator pages | Chain txs (except optional wallet) |
| **api** | HTTP edge: ingest, compose, forge, publish, skills, challenge, auth, events, billing, github-publish, sources | CLI UX |
| **core** | Libraries for CLI / shared pipelines | Public production HTTP |
| **cli** | Terminal workflow (secondary) | Hosted demo path |
| **contracts** | **SkillPool.sol** (demo) | Marketplace / yield |
| **shared** | Types | Runtime |

## Auth & billing

- **GitHub OAuth** — session in KV (`SESSIONS` namespace). Viewing/consuming is always public. Relayer-sponsored chain writes and Pro billing require a session. Forge/compose stay usable anonymously within the monthly quota.
- **Freemium:** 10 free forges/month, enforced on `/forge` and `/compose` (anonymous keyed by IP). Share a public skill you own to unlock unlimited; Pro ($) for private unlimited. Client `record-forge` is closed. Stripe webhooks verify `Stripe-Signature` before any plan change; unpaid checkouts do not grant Pro.
- **Privacy direction:** new forges begin as private drafts; explicit public sharing enables `/s/[hash]`, source attribution, and creator discovery. A public forge is only advertised (`private: false` + skillUrl) after the durable KV record reads back; a registry write failure keeps the draft private rather than handing out a 404 link. Optional SkillPool attestation is a separate proof choice. Legacy public-first records remain discoverable until lifecycle controls are applied.

## Security model

Hardening applied after the 2026-08 audit. Keep these invariants when touching auth, events, or URL fetching:

- **OAuth is CSRF-safe and same-origin.** `/auth/github` stores a random one-time `state` nonce in KV (10 min TTL); the callback verifies and consumes it before exchanging the GitHub code. A forged or replayed `state` is rejected. The optional `redirect` query is restricted to relative application paths (no scheme, authority, or backslashes); the callback builds the destination against `FRONTEND_URL` and requires the resulting origin to match it exactly, so the one-time exchange code cannot be delivered to another site.
- **Session tokens never travel in URLs or JavaScript-accessible storage.** The callback redirects with a single-use 60-second exchange code. `POST /auth/exchange` sets the session as a secure, HttpOnly, SameSite cookie and returns `{ ok: true }`; the JavaScript client never receives the token. The exchange is bound to the initiating browser with a separate `fondof_oauth` nonce and also accepts the frontend `Origin` so sign-in still works when third-party cookies are blocked. Requests from any other origin are rejected. CLI/agents still receive a token for `Authorization: Bearer`.
- **Write endpoints are owner-gated.** `POST /skills/:hash/meta` requires a session for `agentUrl` changes and owner-only for artifact fields (title/body/fit) once a public record exists. `POST /skills/:hash/share` may create a first public record anonymously, but any later mutation — including re-share — requires a session matching the stored owner. Registry upserts never replace `ownerId` / `ownerLogin`; ownerless legacy records are immutable rather than publicly writable. Outcome evidence stays open — it is the visitor "I used this" loop. A `title` sent alongside an outcome/agentUrl patch is a display hint and never overwrites the stored title. Public `/forge` and `/compose` treat that durable record as required: they do not return a shareable `/s/[hash]` URL unless `getPublicSkill` reads the record back.
- **SSRF guard.** Every fetch of a user-supplied URL (article extract, RSS episode lookup, podcast audio resolution, YouTube caption fallback, source-claim proof verification) goes through `safeFetch` in `lib/ssrf.ts`. That helper rejects non-http(s) schemes, credentials, and private/internal/metadata hosts (RFC1918, loopback, link-local, CGNAT, multicast/reserved, `169.254.169.254`, IPv6 ULA/link-local/multicast/doc, `localhost`, `*.local`, `*.internal`), resolves the hostname and checks every returned address before connecting, disables automatic redirects, and re-validates each Location hop. Responses are size- and time-capped. Covered by unit tests — extend them when adding new fetch paths.
- **Stripe webhooks are authenticated.** `POST /billing/webhook` verifies HMAC-SHA256 of `{timestamp}.{rawBody}` against `STRIPE_WEBHOOK_SECRET` (5-minute replay window). Pro is granted only for `checkout.session.completed` with `payment_status` `paid` / `no_payment_required`, or `checkout.session.async_payment_succeeded`. Checkout copies `github_id` onto `subscription_data.metadata` and the webhook persists customer/subscription → user mappings so cancel/pause events revoke Pro even when those objects lack session metadata. Stripe event IDs are recorded so retries are idempotent.
- **Forge quota is a server invariant.** `/forge` and `/compose` reserve a monthly slot before upstream work and release it on failure or a full cache hit. `POST /billing/check-forge` is read-only; `POST /billing/record-forge` is closed (410).
- **GitHub publish is incrementally authorized.** Sign-in requests `read:user`. Gist and repo publish require `gist` / `repo` (or `public_repo`); missing scopes return `github_scope_required` with `/api/auth/github?intent=publish` rather than a GitHub 403 after a successful login.
- **One-time OAuth codes and claimed-use counters are serialized.** Exchange redemption and skill evidence mutations run through a Durable Object (`COORDINATOR`) so concurrent requests cannot double-redeem a code or lose/overcount evidence.
- **Public discovery lists every durable skill, then sorts.** `listPublicSkills` pages through all `pub-skill:` keys (KV list is hash-ordered) before sorting by `composedAt` and applying the requested limit, so a newly published skill is not dropped because its hash sits after the first page.
- **Relayer writes are authenticated and budgeted.** `/publish`, `/challenge`, `/skills/:hash/storm`, on-chain `/use`, and `/challenge/:id/resolve` require a session. Each write is bound to a server-issued intent (normalized params + idempotency), reserved against per-account and global daily spend/op budgets, and blocked by `RELAYER_HALT` or KV `relayer:halt`. Transaction value is capped at 0.001 native. Resolve is a demo oracle: allowlisted `RESOLVER_LOGINS` only, signed with `FONDOF_RESOLVER_KEY` (never the hot user-operation relayer), bound to an open on-chain challenge, and requires an explicit `challengerWon` boolean. Settlements are written to a KV audit record. IP rate limits are not the spend control.
- **Rate limits protect paid upstreams and append logs.** Fixed-window per-IP budgets in `lib/rate-limit.ts` (compose 10/h, ingest 10/h, forge 20/h, events 120/h, etc.). Fail-open by design so demos keep working; do not tighten without checking the judge path. Relayer spend must not rely on this fail-open path.
- **CLI GitHub tokens are owner-only.** The CLI stores the GitHub credential in the OS vault (macOS Keychain / `secret-tool`) when available. The file fallback is `~/.fondof/config.json` with directory mode `0700` and file mode `0600`; the directory and file must be owned by the current user and must not be symlinks. Existing world-readable files are chmod'd before read; rotate any token that was stored that way.

**Session storage note:** The web browser session is stored as an httpOnly cookie (never `localStorage`) and sent automatically on cross-origin API calls. Markdown links are scheme-sanitized before rendering to reduce XSS surface, but the cookie remains the primary guard.

## Supply-side (creator) attribution

Public forges store source URL → skill hash mappings in KV (currently keyed by `source:{domain}`). This powers:
- `/from/[domain]` — source attribution, lineage cues, and evidence-backed impact snapshot
- `/api/sources/:domain` — source skills plus transparent evidence aggregation
- `/api/sources/:domain/impact` — compact source impact summary for cards/embeds
- `/api/sources/:domain/badge.svg` — embeddable badge for show notes / READMEs
- `/api/skills?sort=impact|outcomes|adapted|recent` — focused discovery views with optional genre/topic/stack filters
- `/discover/[genre]` — formal genre landing pages for topic-led discovery
- `/remix/[hash]` and `/api/skills/:hash/lineage` — ancestor/current/public-remix lineage views with source-aware re-forge action
- `/u/[login]` and `/api/skills/creator/:login` — owner/creator evidence snapshots when ownership is known
- Source pages support an authenticated `self-claimed` identity hint plus optional nonce-based domain-control verification; neither is presented as verified authorship or influence
- Skill pages show source credit, genre labels, lineage links, dynamic OG cards, and a re-forge path

**Identity boundary:** domains remain grouping/navigation keys, not proof of thought-leader identity. Canonical source IDs and skill lineage are stored with public artifacts; genres are deterministic labels derived from persisted metadata (not LLM judgements); rankings use explicit offchain evidence summaries and are not causal impact claims. Only compact public commitments need an onchain anchor.

## Progressive disclosure conventions (web)

Public pages follow one rule: **one active mode at a time, and only the audience that needs a control sees it.** Concretely:

- **Boxes are for content; lines are for actions.** Dashed/boxed panels hold real content (outcome receipts, impact snapshots). Invitations to act ("Attach outcome", "Attach agent link", "Claim source") render as single-line affordances, not boxes.
- **Tabs and sections only appear when they have something to do.** On `/s/[hash]` the Talk tab exists only when an agent link is attached or the viewer owns the skill; the Prove tab hides owner actions (stamp on-chain, hide skill) behind an "Owner tools" disclosure.
- **Owner-only controls are gated by session.** Portfolio share buttons render only for the profile owner; source claims only prompt the viewer who can act on them.
- **Power knobs collapse.** QuickPad keeps source + fit repo + Forge visible; shards and privacy live behind an Options disclosure. Secondary metadata (genres, lineage, canonical source IDs) collapses behind a "more" toggle.
- **Provenance stays collapsible.** On-chain detail (signal story, challenges, receipts, explorer links) lives in the collapsed "Provenance & Proof" disclosure with a one-line summary when closed.
- **Capability signals ride on existing surfaces.** The ElevenLabs "Talk to a Skill" voice agent is not a destination section; it appears as a small mic indicator on skill cards (pool paper cards, the public shelf, and skill-page peer cards) — and only when that skill actually has an `agentUrl` attached. No agent, no indicator. Clicking through lands on the skill page's Talk tab.

When adding a surface, place it by audience (visitor vs owner) and intent (consume vs act), then collapse everything that is not the primary action for that audience.

No creator onboarding needed — pages populate from forge data. Optional source claims are user-initiated and remain clearly labelled as self-claimed or domain-control verified, not verified thought-leader identity.

## Key contracts

**SkillPool vs FondofAttestation:** SkillPool is the live quality loop on Monad testnet. `FondofAttestation.sol` is an earlier provenance sketch — keep for history; do not document it as the demo contract.

**Artifact/proof split:** On-chain should remain minimal: skill identity, source commitments, public forger identity, backing, and challenge/use history. Human title, blurb, markdown, fit details, genres, rankings, source identity, and outcome evidence remain offchain. Discovery currently exposes an explainable evidence signal: claimed uses + attached outcome/PR confirmations with transparent caveats, never a claim that a source caused a project change. Public artifact records and evidence history use non-expiring KV; the short-lived Cache API remains only as a fast legacy/meta cache fallback.
