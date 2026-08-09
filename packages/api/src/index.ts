import { Hono } from "hono";
import { cors } from "hono/cors";
import { ingestRoute } from "./routes/ingest.js";
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

export interface Env {
  AI: Ai;
  SESSIONS: KVNamespace;
  MONAD_RPC_URL: string;
  FONDOF_CONTRACT_ADDRESS: string;
  FONDOF_RELAYER_KEY: string;
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

// CORS for frontend
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: [
      "X-Cache",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
  }),
);

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
app.route("/api", ingestRoute);
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

export default app;
