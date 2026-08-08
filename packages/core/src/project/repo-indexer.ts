import type { RepoProfile, LanguageBreakdown, Dependency } from "@fondof/shared";
import { randomUUID } from "node:crypto";
import {
  getLanguages,
  getTree,
  getFileContent,
  getOpenIssues,
  type GitHubTreeEntry,
} from "./github-api.js";
import type { LLMProvider } from "../ingestion/idea-extractor.js";

export interface IndexRepoOptions {
  /** GitHub owner (user or org) */
  owner: string;
  /** Repository name */
  name: string;
  /** GitHub access token */
  token: string;
  /** Default branch name */
  defaultBranch: string;
  /** LLM provider for convention detection */
  llm: LLMProvider;
}

/**
 * Index a GitHub repository — detect language, framework, conventions,
 * dependencies, existing skills, and generate a repo profile.
 */
export async function indexRepo(options: IndexRepoOptions): Promise<RepoProfile> {
  const { owner, name, token, defaultBranch, llm } = options;

  // Fetch data in parallel
  const [languages, tree, issues] = await Promise.all([
    getLanguages(token, owner, name),
    getTree(token, owner, name, defaultBranch),
    getOpenIssues(token, owner, name),
  ]);

  // Process languages into breakdown
  const totalBytes = Object.values(languages).reduce((sum, b) => sum + b, 0);
  const languageBreakdown: LanguageBreakdown[] = Object.entries(languages)
    .map(([language, bytes]) => ({
      language,
      percentage: Math.round((bytes / totalBytes) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Detect dependencies from package files
  const dependencies = await detectDependencies(token, owner, name, tree);

  // Detect frameworks from dependencies and file structure
  const frameworks = detectFrameworks(dependencies, tree);

  // Detect coding conventions via LLM
  const conventions = await detectConventions(token, owner, name, tree, llm);

  // Detect existing skills
  const existingSkills = detectExistingSkills(tree);

  return {
    id: randomUUID(),
    name,
    owner,
    fullName: `${owner}/${name}`,
    languages: languageBreakdown,
    frameworks,
    dependencies,
    conventions,
    existingSkills,
    topicEmbedding: [], // Populated later by embedding step
    openIssueThemes: issues,
    lastIndexed: new Date().toISOString(),
  };
}

/**
 * Detect dependencies from package manifest files.
 */
async function detectDependencies(
  token: string,
  owner: string,
  repo: string,
  tree: GitHubTreeEntry[]
): Promise<Dependency[]> {
  const deps: Dependency[] = [];

  // Check package.json
  if (tree.some((e) => e.path === "package.json")) {
    const content = await getFileContent(token, owner, repo, "package.json");
    if (content) {
      try {
        const pkg = JSON.parse(content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        if (pkg.dependencies) {
          for (const [name, version] of Object.entries(pkg.dependencies)) {
            deps.push({ name, version });
          }
        }
        if (pkg.devDependencies) {
          for (const [name, version] of Object.entries(pkg.devDependencies)) {
            deps.push({ name, version });
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  // Check Cargo.toml
  if (tree.some((e) => e.path === "Cargo.toml")) {
    const content = await getFileContent(token, owner, repo, "Cargo.toml");
    if (content) {
      const depSection = content.match(/\[dependencies\]([\s\S]*?)(\[|$)/);
      if (depSection) {
        const lines = depSection[1].split("\n");
        for (const line of lines) {
          const match = line.match(/^(\S+)\s*=\s*"([^"]+)"/);
          if (match) {
            deps.push({ name: match[1], version: match[2] });
          }
        }
      }
    }
  }

  // Check requirements.txt
  if (tree.some((e) => e.path === "requirements.txt")) {
    const content = await getFileContent(token, owner, repo, "requirements.txt");
    if (content) {
      for (const line of content.split("\n")) {
        const match = line.trim().match(/^([a-zA-Z0-9_-]+)([>=<~!]+(.+))?/);
        if (match && !match[0].startsWith("#")) {
          deps.push({ name: match[1], version: match[3] ?? "*" });
        }
      }
    }
  }

  // Check go.mod
  if (tree.some((e) => e.path === "go.mod")) {
    const content = await getFileContent(token, owner, repo, "go.mod");
    if (content) {
      const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
      if (requireBlock) {
        for (const line of requireBlock[1].split("\n")) {
          const match = line.trim().match(/^(\S+)\s+(\S+)/);
          if (match) {
            deps.push({ name: match[1], version: match[2] });
          }
        }
      }
    }
  }

  return deps;
}

/**
 * Detect frameworks from dependencies and file structure.
 */
function detectFrameworks(deps: Dependency[], tree: GitHubTreeEntry[]): string[] {
  const frameworks: string[] = [];
  const depNames = new Set(deps.map((d) => d.name));
  const paths = new Set(tree.map((e) => e.path));

  // JavaScript/TypeScript frameworks
  if (depNames.has("next")) frameworks.push("Next.js");
  if (depNames.has("react")) frameworks.push("React");
  if (depNames.has("vue")) frameworks.push("Vue");
  if (depNames.has("svelte") || depNames.has("@sveltejs/kit")) frameworks.push("Svelte");
  if (depNames.has("express")) frameworks.push("Express");
  if (depNames.has("fastify")) frameworks.push("Fastify");
  if (depNames.has("hono")) frameworks.push("Hono");
  if (depNames.has("tailwindcss")) frameworks.push("Tailwind CSS");
  if (depNames.has("prisma") || depNames.has("@prisma/client")) frameworks.push("Prisma");
  if (depNames.has("drizzle-orm")) frameworks.push("Drizzle");

  // Python frameworks
  if (depNames.has("django")) frameworks.push("Django");
  if (depNames.has("flask")) frameworks.push("Flask");
  if (depNames.has("fastapi")) frameworks.push("FastAPI");

  // Rust frameworks
  if (depNames.has("actix-web")) frameworks.push("Actix");
  if (depNames.has("axum")) frameworks.push("Axum");
  if (depNames.has("tokio")) frameworks.push("Tokio");

  // Go frameworks
  if (depNames.has("github.com/gin-gonic/gin")) frameworks.push("Gin");
  if (depNames.has("github.com/gofiber/fiber/v2")) frameworks.push("Fiber");

  // Infra
  if (paths.has("wrangler.toml") || paths.has("wrangler.jsonc")) frameworks.push("Cloudflare Workers");
  if (paths.has("Dockerfile")) frameworks.push("Docker");
  if (paths.has("terraform")) frameworks.push("Terraform");

  return frameworks;
}

/**
 * Detect coding conventions by sampling code files and analyzing with LLM.
 */
async function detectConventions(
  token: string,
  owner: string,
  repo: string,
  tree: GitHubTreeEntry[],
  llm: LLMProvider
): Promise<{ errorHandling: string; testing: string; architecture: string }> {
  // Sample a few code files for convention analysis
  const codeFiles = tree
    .filter(
      (e) =>
        e.type === "blob" &&
        /\.(ts|js|rs|py|go)$/.test(e.path) &&
        !e.path.includes("node_modules") &&
        !e.path.includes(".min.") &&
        (e.size ?? 0) < 50000
    )
    .slice(0, 5);

  if (codeFiles.length === 0) {
    return {
      errorHandling: "unknown",
      testing: "unknown",
      architecture: "unknown",
    };
  }

  // Fetch content of sampled files
  const samples: string[] = [];
  for (const file of codeFiles.slice(0, 3)) {
    const content = await getFileContent(token, owner, repo, file.path);
    if (content) {
      samples.push(`--- ${file.path} ---\n${content.slice(0, 2000)}`);
    }
  }

  // Detect test framework from file structure
  const testFiles = tree.filter(
    (e) =>
      e.type === "blob" &&
      (/\.test\.|\.spec\.|_test\.|test_/.test(e.path) ||
        e.path.startsWith("tests/") ||
        e.path.startsWith("test/"))
  );

  const fileStructure = tree
    .filter((e) => e.type === "tree" && e.path.split("/").length === 1)
    .map((e) => e.path)
    .join(", ");

  const prompt = `Analyze these code samples from a repository and determine:
1. Error handling style (e.g. "try/catch with custom errors", "Result types", "anyhow + thiserror")
2. Testing approach (e.g. "vitest, unit-heavy", "pytest with fixtures", "no tests detected")
3. Architecture pattern (e.g. "MVC", "hexagonal/ports-adapters", "serverless functions", "monolith")

Top-level directories: ${fileStructure}
Test files found: ${testFiles.length} (e.g. ${testFiles.slice(0, 3).map((f) => f.path).join(", ")})

Code samples:
${samples.join("\n\n")}

Return JSON only:
{"errorHandling": "...", "testing": "...", "architecture": "..."}`;

  try {
    const response = await llm.chat(
      "You analyze code repositories and detect coding conventions. Return only valid JSON.",
      prompt
    );

    const json = extractJson(response);
    if (json && typeof json === "object" && "errorHandling" in json) {
      const result = json as { errorHandling: string; testing: string; architecture: string };
      return {
        errorHandling: result.errorHandling || "unknown",
        testing: result.testing || "unknown",
        architecture: result.architecture || "unknown",
      };
    }
  } catch {
    // LLM failed, return defaults
  }

  return {
    errorHandling: "unknown",
    testing: testFiles.length > 0 ? `${testFiles.length} test files detected` : "no tests detected",
    architecture: "unknown",
  };
}

/**
 * Detect existing AI agent skills in the repository.
 */
function detectExistingSkills(tree: GitHubTreeEntry[]): string[] {
  const skillPaths = [
    ".kiro/steering/",
    ".kiro/skills/",
    "SKILL.md",
    ".cursor/rules",
    ".cursorrules",
    ".github/copilot-instructions.md",
    "AGENTS.md",
    ".claude/",
  ];

  return tree
    .filter((entry) =>
      skillPaths.some(
        (prefix) => entry.path === prefix.replace(/\/$/, "") || entry.path.startsWith(prefix)
      )
    )
    .map((entry) => entry.path);
}

function extractJson(response: string): unknown | null {
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : response.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
