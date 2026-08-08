import { Hono } from "hono";
import type { Env } from "../index.js";
import { searchExistingSkills, searchSourceMaterial } from "../lib/search.js";

export const searchRoute = new Hono<{ Bindings: Env }>();

// Search for existing skills that might cover a need
searchRoute.post("/search/skills", async (c) => {
  const { query } = await c.req.json<{ query: string }>();
  if (!query) return c.json({ error: "query is required" }, 400);

  const results = await searchExistingSkills(query, c.env);
  return c.json({ results });
});

// Search for source material (podcasts, blogs) about a topic
searchRoute.post("/search/sources", async (c) => {
  const { query } = await c.req.json<{ query: string }>();
  if (!query) return c.json({ error: "query is required" }, 400);

  const results = await searchSourceMaterial(query, c.env);
  return c.json({ results });
});
