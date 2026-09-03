"use client";

import { useEffect } from "react";
import { composeSkill, getSkillSignal, searchPublicSkills } from "@/lib/api";
import { skillPublicPath } from "@/lib/skill-share";

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }

  interface ModelContextTool {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    annotations?: {
      readOnlyHint?: boolean;
      untrustedContentHint?: boolean;
    };
    execute: (input: Record<string, unknown>) => Promise<unknown>;
  }

  interface ModelContext {
    registerTool: (tool: ModelContextTool) => Promise<unknown> | unknown;
  }

  interface Document {
    modelContext?: ModelContext;
  }
}

/**
 * Registers fondof's WebMCP tools with the browser's model context.
 *
 * When ChatGPT or another agent browses fondof, it can call these tools
 * directly instead of trying to click through the UI:
 *   - search_skills
 *   - get_skill
 *   - compose_skill
 */
export function WebMCPProvider() {
  useEffect(() => {
    const mc =
      typeof document !== "undefined"
        ? document.modelContext ?? navigator.modelContext
        : undefined;

    if (!mc || typeof mc.registerTool !== "function") {
      return;
    }

    const tools: ModelContextTool[] = [
      {
        name: "search_skills",
        title: "Search public skills",
        description:
          "Search the public fondof skill pool for existing skills that match a topic or query. Only call this tool once the user has provided a query. Returns a list of skills with title, URL, and snippet.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            query: {
              type: "string",
              description:
                "The topic, technique, or search query. Can be a short phrase or keyword like a technology, pattern, or problem.",
              examples: ["React performance", "retry budgets for webhooks"],
            },
          },
          required: ["query"],
        },
        outputSchema: {
          type: "array",
          description:
            "A list of matching public skills, each with title, URL, and snippet.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              snippet: { type: "string" },
            },
            required: ["title", "url"],
          },
        },
        annotations: {
          readOnlyHint: true,
          untrustedContentHint: false,
        },
        execute: async (input) => {
          const { query } = input as { query: string };
          if (!query || typeof query !== "string") {
            throw new Error(
              "I need a search query before I can look for skills. Ask the user what topic they want to search for (e.g., 'React performance' or 'retry budgets').",
            );
          }
          const res = await searchPublicSkills(query, 10);
          if (res.error) throw new Error(res.error);
          return (res.skills ?? []).slice(0, 10).map((skill) => ({
            title: skill.title || "Untitled skill",
            url: `https://fondof.netlify.app${skillPublicPath(skill.skillHash)}`,
            snippet:
              skill.blurb ||
              skill.sourceUrls?.[0] ||
              skill.repo ||
              "Public skill",
          }));
        },
      },
      {
        name: "get_skill",
        title: "Get a skill by hash",
        description:
          "Fetch a public fondof skill by its hash. Only call this tool once the user has provided a skill hash or fondof skill URL (e.g., https://fondof.netlify.app/s/{hash}). Returns the title, markdown body, target repo, source URLs, and evidence summary.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            skill_hash: {
              type: "string",
              description:
                "The skill hash, taken from a fondof skill URL like /s/{hash} or pasted by the user.",
              examples: [
                "55739f72d6ba6b15d82d6fcf6eac688d43f0c2852edfbe1265440eb1010eea6a",
              ],
            },
          },
          required: ["skill_hash"],
        },
        outputSchema: {
          type: "object",
          description: "The public skill record with metadata and markdown.",
          properties: {
            title: { type: ["string", "null"] },
            markdown: { type: ["string", "null"] },
            repo: { type: ["string", "null"] },
            skillHash: { type: ["string", "null"] },
            sourceUrls: { type: "array", items: { type: "string" } },
          },
        },
        annotations: {
          readOnlyHint: true,
          untrustedContentHint: false,
        },
        execute: async (input) => {
          const { skill_hash } = input as { skill_hash: string };
          if (!skill_hash || typeof skill_hash !== "string") {
            throw new Error(
              "I need a skill hash before I can fetch a skill. Ask the user for a fondof skill URL like https://fondof.netlify.app/s/{hash} or the hash itself.",
            );
          }
          const res = await getSkillSignal(skill_hash);
          if (res.error) throw new Error(res.error);
          return res;
        },
      },
      {
        name: "compose_skill",
        title: "Compose a new skill",
        description:
          "Turn a stated need or one or more source URLs into a single repo-specific skill. Call this once per skill and pass every source URL in the urls array; the backend merges up to 4 sources. Either a need or one or more URLs must be present before calling. Optionally pass a target repo, top_shards, and private. Returns the generated markdown, skill hash, shareable URL, and source_urls for attribution. If a quota error is returned, stop and ask the user to sign in or share a skill.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          description:
            "Provide exactly one of need or urls/url. repo, top_shards, and private are optional. If the user provides multiple links, pass them all in urls. If the user only said something vague like 'create a skill', ask them for a need or urls before calling. Set private to false only when the user explicitly wants a public share and is signed in.",
          properties: {
            need: {
              type: "string",
              description:
                "A free-text description of a technique or problem to solve. Use this when the user describes a topic, not when they paste URLs. Examples: 'retry budgets for async TypeScript fetch' or 'how to cache Deno KV queries'.",
              examples: [
                "retry budgets for async TypeScript fetch",
                "structured logging for worker services",
              ],
            },
            url: {
              type: "string",
              description:
                "A single public article, blog post, documentation page, or YouTube URL. Prefer the urls array if the user provided multiple links.",
              examples: [
                "https://nextjs.org/blog/next-16-3",
                "https://www.youtube.com/watch?v=7wuYBfE131U",
              ],
            },
            urls: {
              type: "array",
              description:
                "One or more public article, blog post, documentation page, or YouTube URLs to combine into a single skill. Use this when the user gives multiple sources. Max 4 URLs.",
              items: { type: "string" },
              maxItems: 4,
              examples: [
                [
                  "https://www.youtube.com/watch?v=b9tB9Q1XOM0",
                  "https://paulgraham.com/brandage.html",
                ],
              ],
            },
            repo: {
              type: "string",
              description:
                "Target repository in owner/name form or as a GitHub URL.",
              examples: ["udirobert/fondof"],
            },
            top_shards: {
              type: "number",
              description:
                "Number of extracted ideas to include in the skill (1-6, default 2 for single source, 3 for multi-source).",
              minimum: 1,
              maximum: 6,
              examples: [2, 3],
            },
            private: {
              type: "boolean",
              description:
                "When false, the skill is shared publicly and can unlock unlimited forges for signed-in users. Default true. Only set false if the user explicitly asks to share.",
            },
          },
        },
        outputSchema: {
          type: "object",
          description:
            "The composed skill, or a structured error with code, hint, unlock options, and a login URL. If error is present, stop and follow the unlock instructions.",
          properties: {
            title: { type: ["string", "null"] },
            skill_hash: { type: ["string", "null"] },
            skill_url: { type: ["string", "null"] },
            markdown: { type: ["string", "null"] },
            source_title: { type: ["string", "null"] },
            source_urls: {
              type: "array",
              description: "All source URLs that contributed to the skill.",
              items: { type: "string" },
            },
            source_failures: {
              type: "array",
              description: "Sources that could not be ingested, with per-URL error messages.",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  error: { type: "string" },
                },
              },
            },
            fitted_to: { type: ["string", "null"] },
            private: { type: ["boolean", "null"] },
            error: { type: ["string", "null"] },
            code: { type: ["string", "null"] },
            hint: { type: ["string", "null"] },
            unlock: { type: "array", items: { type: "string" } },
            login_url: { type: ["string", "null"] },
            remaining: { type: ["number", "null"] },
          },
        },
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: true,
        },
        execute: async (input) => {
          const { need, url, urls, repo, top_shards, private: isPrivate } = input as {
            need?: string;
            url?: string;
            urls?: string[];
            repo?: string;
            top_shards?: number;
            private?: boolean;
          };

          const sourceUrls: string[] = [];
          if (typeof url === "string" && url.trim()) sourceUrls.push(url.trim());
          if (Array.isArray(urls)) {
            for (const u of urls) {
              if (typeof u === "string" && u.trim()) sourceUrls.push(u.trim());
            }
          }
          const deduped = [...new Set(sourceUrls)];

          const hasNeed = typeof need === "string" && need.trim().length > 0;
          const hasUrls = deduped.length > 0;

          if (!hasNeed && !hasUrls) {
            return {
              error:
                "I need a source to compose from. Ask the user to either describe the skill they want in plain text (need) or paste one or more public URLs to articles, blog posts, docs pages, or YouTube videos (urls).",
            };
          }
          if (hasNeed && hasUrls) {
            return {
              error:
                "Provide exactly one of need or url(s), not both. If the user gave URLs, use urls. If they described a topic in words, use need.",
            };
          }
          if (deduped.length > 4) {
            return {
              error:
                "You can combine at most 4 URLs in one compose call. Ask the user to pick the most relevant 4.",
            };
          }

          const res = await composeSkill({
            ...(hasNeed ? { need: need.trim() } : {}),
            ...(hasUrls ? { urls: deduped } : {}),
            ...(repo ? { repo } : {}),
            ...(typeof top_shards === "number" ? { topShards: top_shards } : {}),
            ...(typeof isPrivate === "boolean" ? { private: isPrivate } : {}),
          });

          if (res.error) {
            return {
              error: res.error,
              code: res.code ?? null,
              hint: res.hint ?? null,
              unlock: res.unlock ?? null,
              login_url: res.login_url ?? null,
              remaining: res.remaining ?? null,
              source_failures: res.sourceFailures ?? [],
            };
          }

          return {
            title: res.title ?? null,
            skill_hash: res.skillHash ?? null,
            skill_url: res.skillUrl ?? null,
            markdown: res.markdown ?? null,
            source_title: res.sourceTitle ?? null,
            source_urls: res.sourceUrls ?? [],
            source_failures: res.sourceFailures ?? [],
            fitted_to: res.fittedTo ?? null,
            private: res.private ?? true,
          };
        },
      },
    ];

    void (async () => {
      for (const tool of tools) {
        try {
          // Some WebMCP shims return undefined; await safely handles both.
          await mc.registerTool(tool);
        } catch {
          // ignored
        }
      }
    })();
  }, []);

  return null;
}
