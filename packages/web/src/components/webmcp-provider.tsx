"use client";

import { useEffect } from "react";
import { composeSkill, getSkillSignal, searchExistingSkills } from "@/lib/api";

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
          "Search the public fondof skill pool for existing skills that match a topic or query. DO NOT call this tool unless the user has provided a query. If no query is present, ask the user what topic they want to search for (e.g., React performance, retry budgets, webhook idempotency). Returns a list of skills with title, URL, and snippet.",
        inputSchema: {
          type: "object",
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
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              snippet: { type: "string" },
            },
          },
        },
        execute: async (input) => {
          const { query } = input as { query: string };
          if (!query || typeof query !== "string") {
            throw new Error(
              "I need a search query before I can look for skills. Ask the user what topic they want to search for (e.g., 'React performance' or 'retry budgets').",
            );
          }
          const res = await searchExistingSkills(query);
          if (res.error) throw new Error(res.error);
          return res.results;
        },
      },
      {
        name: "get_skill",
        title: "Get a skill by hash",
        description:
          "Fetch a public fondof skill by its hash. DO NOT call this tool unless the user has provided a skill hash or a fondof skill URL (e.g., https://fondof.netlify.app/s/{hash}). If neither is present, ask the user for the skill URL or hash. Returns the title, markdown body, target repo, source URLs, and evidence summary.",
        inputSchema: {
          type: "object",
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
          "Turn a stated need or a source URL into a repo-specific skill. DO NOT call this tool unless the user has already provided either a need (free-text description of a technique or problem) or a url (a public article, blog post, documentation page, or YouTube link). If neither is present, ask the user to describe what they want to learn or paste a link. Optionally pass a target repo and top_shards. Returns the generated markdown, skill hash, and shareable skill URL.",
        inputSchema: {
          type: "object",
          description:
            "Provide exactly one of need or url. repo and top_shards are optional. If the user only said something vague like 'create a skill', ask them for a need or url before calling.",
          properties: {
            need: {
              type: "string",
              description:
                "A free-text description of a technique or problem to solve. Examples: 'retry budgets for async TypeScript fetch' or 'how to cache Deno KV queries'.",
              examples: [
                "retry budgets for async TypeScript fetch",
                "structured logging for worker services",
              ],
            },
            url: {
              type: "string",
              description:
                "A public article, blog post, documentation page, or YouTube URL to extract ideas from. The page must be publicly readable without login.",
              examples: [
                "https://nextjs.org/blog/next-16-3",
                "https://www.youtube.com/watch?v=7wuYBfE131U",
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
                "Number of extracted ideas to include in the skill (1-6, default 2).",
              minimum: 1,
              maximum: 6,
              examples: [2, 3],
            },
          },
        },
        outputSchema: {
          type: "object",
          description:
            "The composed skill with title, hash, markdown, source info, and public share URL.",
          properties: {
            title: { type: "string" },
            skill_hash: { type: "string" },
            skill_url: { type: ["string", "null"] },
            markdown: { type: "string" },
            source_title: { type: ["string", "null"] },
            fitted_to: { type: ["string", "null"] },
            private: { type: "boolean" },
          },
        },
        execute: async (input) => {
          const { need, url, repo, top_shards } = input as {
            need?: string;
            url?: string;
            repo?: string;
            top_shards?: number;
          };
          if (!need && !url) {
            throw new Error(
              "I need a source to compose from. Ask the user to either describe the skill they want in plain text (need) or paste a public URL to an article, blog post, docs page, or YouTube video (url).",
            );
          }
          const res = await composeSkill({
            ...(need ? { need } : {}),
            ...(url ? { url } : {}),
            ...(repo ? { repo } : {}),
            ...(typeof top_shards === "number" ? { topShards: top_shards } : {}),
          });
          if (res.error) throw new Error(res.error);
          return {
            title: res.title,
            skill_hash: res.skillHash,
            skill_url: res.skillUrl ?? null,
            markdown: res.markdown,
            source_title: res.sourceTitle,
            fitted_to: res.fittedTo,
            private: res.private,
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
