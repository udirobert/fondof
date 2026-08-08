import { Hono } from "hono";
import type { Env } from "../index.js";
import { searchExistingSkills, searchSourceMaterial } from "../lib/search.js";
import { embed } from "../lib/llm.js";
import {
  compactEmbedding,
  cosineSimilarity,
} from "../lib/embedding-compact.js";
import { rateLimit } from "../lib/rate-limit-mw.js";

export const searchRoute = new Hono<{ Bindings: Env }>();

type IdeaSeed = {
  title: string;
  description?: string;
  embedding?: number[];
};

// Search for existing skills that might cover a need (Exa — compare stage)
searchRoute.post("/search/skills", rateLimit("search"), async (c) => {
  const body = await c.req.json<{
    query: string;
    ideas?: IdeaSeed[];
  }>();
  const { query, ideas } = body;
  if (!query) return c.json({ error: "query is required" }, 400);

  if (!c.env.EXA_API_KEY) {
    return c.json({
      results: [],
      provider: null,
      error: "Exa compare is disabled",
      features: { exa: false },
    });
  }

  const results = await searchExistingSkills(query, c.env);

  // Optional: rank vs idea embeddings (Workers AI) when client sends seeds
  let scored = results;
  let embedScored = false;
  if (ideas?.length && results.length > 0) {
    try {
      const ideaEmbeds = ideas
        .map((i) =>
          i.embedding?.length
            ? compactEmbedding(i.embedding)
            : null,
        )
        .filter((e): e is number[] => !!e);

      let workingIdeaEmbeds = ideaEmbeds;
      if (workingIdeaEmbeds.length === 0) {
        const texts = ideas
          .slice(0, 4)
          .map((i) => `${i.title}: ${i.description ?? ""}`);
        const fresh = await embed(c.env.AI, texts);
        workingIdeaEmbeds = fresh.map((e) => compactEmbedding(e));
      }

      if (workingIdeaEmbeds.length > 0) {
        const skillTexts = results.map(
          (r) => `${r.title}: ${r.snippet ?? ""}`,
        );
        const skillEmbeds = (await embed(c.env.AI, skillTexts)).map((e) =>
          compactEmbedding(e),
        );
        scored = results
          .map((r, i) => {
            const se = skillEmbeds[i] ?? [];
            const perIdea = workingIdeaEmbeds.map((ie, ideaIndex) => ({
              ideaIndex,
              score: cosineSimilarity(ie, se),
            }));
            const best = Math.max(0, ...perIdea.map((p) => p.score));
            return { ...r, score: best, ideaScores: perIdea };
          })
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        embedScored = true;
      }
    } catch {
      // keyword / Exa order is fine
    }
  }

  return c.json({
    results: scored,
    provider: "exa",
    embedScored,
    features: { exa: true },
  });
});

// Search for source material (podcasts, blogs) about a topic
searchRoute.post("/search/sources", rateLimit("search"), async (c) => {
  const { query } = await c.req.json<{ query: string }>();
  if (!query) return c.json({ error: "query is required" }, 400);

  const results = await searchSourceMaterial(query, c.env);
  return c.json({ results, provider: "exa" });
});
