import { Hono } from "hono";
import { cors } from "hono/cors";
import { ingestRoute } from "./routes/ingest.js";
import { composeRoute } from "./routes/compose.js";
import { forgeRoute } from "./routes/forge.js";
import { publishRoute } from "./routes/publish.js";
import { skillsRoute } from "./routes/skills.js";
import { challengeRoute } from "./routes/challenge.js";
import { searchRoute } from "./routes/search.js";
import { authRoute } from "./routes/auth.js";
import { eventsRoute } from "./routes/events.js";
import { billingRoute } from "./routes/billing.js";
import { githubPublishRoute } from "./routes/github-publish.js";
import { sourcesRoute } from "./routes/sources.js";
import { relayerRoute } from "./routes/relayer.js";

export interface Env {
  AI: Ai;
  SESSIONS: KVNamespace;
  /** Strongly consistent coordinator for one-time codes and evidence counters. */
  COORDINATOR?: DurableObjectNamespace;
  MONAD_RPC_URL: string;
  FONDOF_CONTRACT_ADDRESS: string;
  FONDOF_RELAYER_KEY: string;
  FONDOF_RESOLVER_KEY?: string;
  RESOLVER_LOGINS?: string;
  RELAYER_HALT?: string;
  FRONTEND_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  CF_API_TOKEN?: string;
  /** Alias some envs use instead of CF_API_TOKEN */
  CLOUDFLARE_API_TOKEN?: string;
  VENICE_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  EXA_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

function frontendOriginFromEnv(frontendUrl: string | undefined): string {
  try {
    return new URL(frontendUrl || "https://fondof.netlify.app").origin;
  } catch {
    return "https://fondof.netlify.app";
  }
}

// CORS for frontend. Public reads stay `*`. The OAuth exchange is credentialed
// so the initiating-browser cookie can be sent; that route cannot use `*`.
app.use("*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path === "/api/auth/exchange") {
    const allowed = frontendOriginFromEnv(c.env.FRONTEND_URL);
    return cors({
      origin: (origin) => (origin === allowed ? origin : allowed),
      credentials: true,
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })(c, next);
  }
  return cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: [
      "X-Cache",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
  })(c, next);
});

// API-oriented llms.txt for agents hitting the worker host directly
const API_LLMS_TXT = `# fondof API

Base URL: https://fondof-api.trustfall.workers.dev

> fondof turns a URL (YouTube, blog, podcast) or a stated need into a coding skill fitted to a repo's stack. Agents get one endpoint: POST /api/compose. The core loop is useful without blockchain; SkillPool is optional downstream proof.

## Endpoints

### POST /api/compose — one-shot skill composition (use this)

Body: { "url": "<source url>" | "need": "<stated need>", "repo": "owner/name" | { "name": "…", "frameworks": ["…"], "languages": ["…"] }, "topShards": 2, "private": false }

- Exactly one of url / need. repo as "owner/name" or a GitHub URL is auto-detected (frameworks + languages from the repo's package.json).
- Compose is private by default; pass "private": false for an explicit public share. A shareable skillUrl is returned only after the durable public record is written and read back. If that write fails, the response stays private (skillUrl: null) with the markdown still included.
- Response: { markdown, ideas: [{ title, description, domain, applicability, patternType, sourceUrl }], skillHash, skillUrl, title, canonicalSources, derivedFromSkillHash, sourceUrl, sourceHash, contentType, fittedTo, onChain, private, providers }
- Errors: 400 bad body, 402 monthly forge quota exceeded (3/IP or signed-in free account), 422 nothing extractable, 429 rate limit (10/hour/IP), 500 upstream.

Example:
curl -s -X POST https://fondof-api.trustfall.workers.dev/api/compose -H 'content-type: application/json' -d '{"url":"https://www.youtube.com/watch?v=7wuYBfE131U","repo":"udirobert/fondof"}'

What to do with it: save markdown into .kiro/steering/ or .cursor/rules/ (or CLAUDE.md), then share skillUrl.

### Other endpoints

- POST /api/ingest { url | need } → { ideas, sourceHash, … } — extract shards only (no forge)
- POST /api/forge { ideas, repo? } → { markdown, skillHash, … } — forge from your own idea list (same monthly quota as compose)
- POST /api/publish { skillHash, sourceHashes, … } — attest a skill you own on SkillPool via the relayer (session required; wallet forge is separate)
- POST /api/challenge { skillHash } — stake a dispute via the relayer (session required)
- POST /api/challenge/{id}/resolve — demo oracle only (allowlisted GitHub login + FONDOF_RESOLVER_KEY); requires an explicit challengerWon boolean bound to an open challenge
- POST /api/relayer/intent — issue a short-lived intent bound to normalized relayer params
- POST /api/skills/{hash}/share — first share of a private draft as a public offchain artifact; later updates require the stored owner
- DELETE /api/skills/hash/visibility — owner-only hide/unlist from public discovery
- GET /api/skills — public skill discovery; sort=impact|outcomes|adapted|recent gives focused evidence views (not causal impact). Optional genre, domain, framework, and language filters expose deterministic topic/stack discovery.
- GET /api/skills/creator/{login} — evidence summary for public skills owned by a GitHub login
- GET /api/skills/{hash}/lineage — parent and public remix metadata for a skill
- GET /remix/{hash} — browsable web lineage page with a dynamic social card
- GET /discover/{genre} — web genre landing pages such as reliability, performance, architecture, and developer-tools
- GET /api/skills/{hash} — one skill (off-chain or attested)
- POST /api/skills/{hash}/use — record a claimed use; signed-in users deduplicate by account, anonymous users need an explicit browser receipt key for deduplication
- POST /api/skills/{hash}/meta — attach an outcome; linked PRs are stored as unverified evidence until independently checked
- POST /api/skills/{hash}/verify-pr — optionally ask GitHub to confirm a linked public PR exists; confirmation does not prove causality
- GET /api/sources/{domain} — source skills plus an evidence-backed impact snapshot and optional self-claim
- GET /api/sources/{domain}/impact — compact source evidence summary
- POST /api/sources/{domain}/claim — authenticated self-claim, explicitly not proof of authorship
- POST /api/sources/{domain}/claim/challenge — short-lived nonce for proving domain control
- POST /api/sources/{domain}/claim/verify — verify nonce on a public page under the claimed domain

## Notes

- Rate limits: compose 10/h, ingest 10/h, forge 20/h per IP. Monthly forge quota is 3 (anonymous per IP, signed-in free per account); 402 means the quota is spent. X-Cache: HIT means a cached result.
- Skill markdown sections: # Title, ## Context, ## Guidance, ## Anti-patterns, ## References.
- Full product docs: https://fondof.netlify.app/llms.txt
`;

// Health check
app.get("/", (c) =>
  c.json({
    name: "fondof-api",
    version: "0.1.0",
    status: "ok",
    features: {
      firecrawl: !!c.env.FIRECRAWL_API_KEY,
      elevenlabs: !!c.env.ELEVENLABS_API_KEY,
      exa: !!c.env.EXA_API_KEY,
      venice: !!c.env.VENICE_API_KEY,
      edgeCache: true,
      rateLimit: true,
    },
  })
);

// API routes
app.get("/llms.txt", (c) =>
  c.text(API_LLMS_TXT, 200, { "Content-Type": "text/plain; charset=utf-8" }),
);
app.route("/api", ingestRoute);
app.route("/api", composeRoute);
app.route("/api", forgeRoute);
app.route("/api", publishRoute);
app.route("/api", skillsRoute);
app.route("/api", challengeRoute);
app.route("/api", searchRoute);
app.route("/api", authRoute);
app.route("/api", eventsRoute);
app.route("/api", billingRoute);
app.route("/api", githubPublishRoute);
app.route("/api", sourcesRoute);
app.route("/api", relayerRoute);

export { FondofCoordinator } from "./durable/coordinator.js";
export default app;
