import type { IdeaFromAPI } from "@/lib/api";

/** Markdown agents can paste into Cursor / Claude / skill files. */
export function formatShardsForAgent(opts: {
  ideas: IdeaFromAPI[];
  sourceTitle?: string;
  sourceUrl?: string;
  fondObject?: string;
}): string {
  const { ideas, sourceTitle, sourceUrl, fondObject } = opts;
  const name = (sourceTitle || fondObject || "fondof-shards")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const lines = [
    "---",
    `name: ${name || "fondof-shards"}`,
    "description: Ideas extracted by fondof — forge into a fitted agent skill.",
    sourceUrl ? `source: ${sourceUrl}` : null,
    `extracted: ${ideas.length}`,
    "---",
    "",
    `# ${sourceTitle || "Ideas from fondof"}`,
    "",
    sourceUrl ? `Source: ${sourceUrl}` : null,
    fondObject ? `Object: fondof · ${fondObject}` : null,
    "",
    "Use these as forge material. Prefer combining Forge-worthy shards into one skill fitted to the repo.",
    "",
  ].filter((x) => x !== null) as string[];

  for (const idea of ideas) {
    lines.push(`## ${idea.title}`);
    lines.push("");
    lines.push(idea.description);
    lines.push("");
    const meta = [
      idea.patternType,
      ...(idea.domain ?? []).slice(0, 3),
    ].filter(Boolean);
    if (meta.length) lines.push(`_${meta.join(" · ")}_`);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function formatTalkToSkillPrompt(opts: {
  title?: string | null;
  markdown?: string;
  skillUrl?: string;
  repo?: string | null;
  sourceUrls?: string[];
}): string {
  const title = opts.title?.trim() || "Untitled fondof skill";
  const repo = opts.repo?.trim() || null;
  const sources = opts.sourceUrls?.filter(Boolean) ?? [];
  const skillBody =
    opts.markdown?.trim() ||
    "The skill body is unavailable here; use the public fondof skill URL as the source of truth.";

  // Build the system prompt template inline so the agent receives a
  // ready-to-use instruction block, not a prompt that itself has to compose one.
  const systemPrompt = [
    `You are a conversational guide for the fondof skill: ${title}.`,
    "",
    repo
      ? `Your job is to help the user understand and apply this skill to ${repo}.`
      : "Your job is to help the user understand and apply this skill to their codebase.",
    "Use the supplied skill as the primary source of truth.",
    "Explain the reasoning behind each piece of guidance, then give concrete next steps.",
    "When a question is outside the skill or its sources, say so clearly.",
    "Do not invent citations, repository facts, implementation results, or outcomes.",
    "Distinguish source-backed guidance from repo-specific inference.",
    "Ask one clarifying question when the target repo or goal is ambiguous.",
    "Prefer concise spoken answers — one idea at a time.",
    "",
    "Skill:",
    skillBody,
    ...(sources.length > 0
      ? ["", "Sources:", ...sources.map((url) => `- ${url}`)]
      : []),
    ...(opts.skillUrl ? ["", `Public skill page: ${opts.skillUrl}`] : []),
  ].join("\n");

  const firstSourceDomain = (() => {
    if (sources.length === 0) return null;
    try {
      return new URL(sources[0]!).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  const firstMessage = repo
    ? `You're talking to a skill${firstSourceDomain ? ` forged from ${firstSourceDomain}` : ""}. I can explain the core idea, connect it to ${repo}, quiz you on the important parts, or help you choose a first implementation step. What do you want to explore?`
    : `You're talking to a fondof skill: ${title}. I can explain the core idea, walk through the guidance, quiz you on the important parts, or help you apply it. What do you want to explore?`;

  return [
    "Create a talkable ElevenAgent from this fondof skill using the ElevenLabs Hosted MCP.",
    "",
    "Connection: the ElevenLabs Hosted MCP server is at https://api.elevenlabs.io/v1/mcp",
    "Connect via the ElevenLabs integration in your MCP client (OAuth sign-in, no local install).",
    "Use the connected MCP tools to create and configure the agent — do not call the ElevenLabs REST API directly.",
    "",
    "Before creating or changing an agent, show me the proposed name, voice, first message,",
    "and system prompt, and wait for my approval.",
    "",
    `Skill title: ${title}`,
    repo ? `Target repository: ${repo}` : null,
    opts.skillUrl ? `Public fondof skill: ${opts.skillUrl}` : null,
    sources.length > 0
      ? `Source URLs:\n${sources.map((url) => `- ${url}`).join("\n")}`
      : null,
    "",
    "Use this system prompt for the agent:",
    "---",
    systemPrompt,
    "---",
    "",
    `Suggested first message: "${firstMessage}"`,
    "",
    "After creation:",
    "1. Retrieve the agent's shareable/widget URL.",
    "2. Run these grounding checks by asking the agent directly:",
    "   a. What is the main idea of this skill?",
    "   b. How does it apply to the target repository?",
    "   c. What should a developer avoid?",
    "3. Mark each answer: grounded / inference / honest-miss.",
    "4. If any answer hallucinates source facts or claims an unverified outcome, revise the prompt before sharing.",
    "",
    "Return: agent id, shareable link, voice, first message, and grounding-check results.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function formatSelectedPrompt(opts: {
  ideas: IdeaFromAPI[];
  repo?: string;
}): string {
  const titles = opts.ideas.map((i) => i.title).join(", ");
  return [
    `Forge an agent skill from these fondof shards${opts.repo ? ` for \`${opts.repo}\`` : ""}: ${titles}.`,
    "",
    ...opts.ideas.map(
      (i, n) =>
        `${n + 1}. **${i.title}** (${i.patternType}) — ${i.description}`,
    ),
    "",
    "Output a single markdown skill with Context, Guidance (code), Anti-patterns, and References.",
  ].join("\n");
}
