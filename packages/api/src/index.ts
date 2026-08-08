import { Hono } from "hono";
import { cors } from "hono/cors";
import { ingestRoute } from "./routes/ingest.js";
import { forgeRoute } from "./routes/forge.js";
import { publishRoute } from "./routes/publish.js";
import { skillsRoute } from "./routes/skills.js";
import { challengeRoute } from "./routes/challenge.js";

export interface Env {
  AI: Ai;
  MONAD_RPC_URL: string;
  FONDOF_CONTRACT_ADDRESS: string;
  FONDOF_RELAYER_KEY: string;
  CF_API_TOKEN?: string;
  NVIDIA_API_KEY?: string;
  VENICE_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://fondof.netlify.app", "https://fondof.vercel.app"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// Health check
app.get("/", (c) => c.json({ name: "fondof-api", version: "0.1.0", status: "ok" }));

// API routes
app.route("/api", ingestRoute);
app.route("/api", forgeRoute);
app.route("/api", publishRoute);
app.route("/api", skillsRoute);
app.route("/api", challengeRoute);

export default app;
