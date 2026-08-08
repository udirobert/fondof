import { Hono } from "hono";
import { cors } from "hono/cors";
import { ingestRoute } from "./routes/ingest.js";
import { forgeRoute } from "./routes/forge.js";
import { publishRoute } from "./routes/publish.js";
import { skillsRoute } from "./routes/skills.js";
import { challengeRoute } from "./routes/challenge.js";
import { searchRoute } from "./routes/search.js";

export interface Env {
  AI: Ai;
  MONAD_RPC_URL: string;
  FONDOF_CONTRACT_ADDRESS: string;
  FONDOF_RELAYER_KEY: string;
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
    allowHeaders: ["Content-Type"],
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

export default app;
