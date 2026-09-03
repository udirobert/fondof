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
          "Search the public fondof skill pool for existing skills that match a topic or query. Returns a list of skills with title, URL, and snippet.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The topic, technique, or search query.",
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
          const res = await searchExistingSkills(query);
          if (res.error) throw new Error(res.error);
          return res.results;
        },
      },
      {
        name: "get_skill",
        title: "Get a skill by hash",
        description:
          "Fetch a public fondof skill by its hash. Returns the title, markdown body, target repo, source URLs, and evidence summary.",
        inputSchema: {
          type: "object",
          properties: {
            skill_hash: {
              type: "string",
              description:
                "The skill hash, found in a skill URL like /s/{hash}.",
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
          const res = await getSkillSignal(skill_hash);
          if (res.error) throw new Error(res.error);
          return res;
        },
      },
      {
        name: "compose_skill",
        title: "Compose a new skill",
        description:
          "Turn a stated need or a source URL into a repo-specific skill. Provide either need (free text) or url (a public article/YouTube), plus an optional target repo. Returns the generated markdown, skill hash, and shareable skill URL.",
        inputSchema: {
          type: "object",
          properties: {
            need: {
              type: "string",
              description:
                "A free-text description of a technique or problem to solve.",
            },
            url: {
              type: "string",
              description:
                "A public article, documentation, or YouTube URL to extract ideas from.",
            },
            repo: {
              type: "string",
              description:
                "Target repository in owner/name form (e.g. udirobert/fondof) or a GitHub URL.",
            },
            top_shards: {
              type: "number",
              description:
                "Number of extracted ideas to include in the skill (1-6, default 2).",
              minimum: 1,
              maximum: 6,
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
            throw new Error("Provide either a need or a url to compose from.");
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
        } catch (e) {
           
          console.error("[WebMCP] registerTool failed:", tool.name, e);
        }
      }
    })();
  }, []);

  return null;
}
