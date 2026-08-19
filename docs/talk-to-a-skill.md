# Talk to a Skill — ElevenLabs MCP challenge

## The idea

fondof turns source material into a skill fitted to a real repository. **Talk to a Skill** adds a voice-first interface to that artifact:

```text
source → extracted ideas → fitted skill → ElevenAgent → spoken exploration
```

This is deliberately more specific than "chat with a document." The ElevenAgent explains and applies the forged skill, while fondof supplies the source, repo fit, and provenance.

## Why this belongs in fondof

- The input is already fondof's core input: an article, podcast, video, GitHub repository, or need.
- The output is already fondof's core output: a reusable skill rather than a one-off summary.
- Voice gives the skill a new surface: explanation, Socratic questioning, and guided application.
- The SkillPool remains downstream: usage, outcomes, attribution, and optional public proof.

## Reproducible pipeline

1. Open a public fondof skill page or copy the skill markdown.
2. Copy the **Talk to a Skill** prompt from the skill page.
3. Give the prompt to an MCP-capable agent with ElevenLabs access.
4. Review the proposed agent name, first message, voice, and system prompt.
5. Approve creation through ElevenLabs MCP.
6. Run three grounding questions:
   - What is the main idea of this skill?
   - How does it apply to the target repository?
   - What should a developer avoid?
7. Share the agent link alongside the fondof skill URL.

The reusable workflow is [`skills/talk-to-a-skill.md`](../skills/talk-to-a-skill.md).

## Connection path

The challenge uses the **ElevenLabs Hosted MCP** — a remote MCP server, no local install.

**Endpoint:** `https://api.elevenlabs.io/v1/mcp`

Connect via the ElevenLabs integration in Claude Desktop (Settings → Integrations → ElevenLabs, OAuth sign-in). The hosted server exposes agent-management tools: create agents, update prompts and voices, retrieve shareable links, and more.

For MCP clients that support remote HTTP + OAuth but not the Claude connector, use the same endpoint directly. Disclose the client in your submission.

If you fall back to the official local `elevenlabs-mcp` server, disclose it — local MCP is not the same as Hosted MCP.

## Demo script — 75 to 90 seconds

### 0:00–0:08 — Hook

> What if something you learned could explain itself — and already understood your codebase?

Show the fondof source input and the phrase **source → skill → voice agent**.

### 0:08–0:25 — Extract

Paste a technical article, podcast, or repository into fondof. Show ideas arriving as selectable material.

Say:

> fondof extracts the useful thinking instead of leaving us with a wall of summary.

### 0:25–0:38 — Forge

Select the strongest ideas, choose the target repo, and forge the skill. Show the fitted-for-repo result and the source/provenance link.

### 0:38–0:55 — Create the agent

Copy the Talk to a Skill prompt into the MCP-capable agent. Show the proposed ElevenAgent configuration, then approve creation through ElevenLabs MCP.

### 0:55–1:12 — Talk to it

Ask:

- What is the main idea?
- How does it apply to this repo?
- What should I avoid?

Show a concise voice response grounded in the skill.

### 1:12–1:25 — Close

> The source became a fitted skill, and the skill became something we can talk through. SkillPool can then carry the usage, outcome, and provenance story downstream.

Show the fondof skill page and ElevenAgent share link.

## Submission language

If using Hosted MCP through Claude:

> Built with fondof + ElevenLabs Hosted MCP in Claude. fondof turns source material into a repo-specific skill, then Claude uses the ElevenLabs connector to create a voice agent that explains and applies that skill.

If using the local official server in another MCP client:

> Built with fondof + the official ElevenLabs MCP server in [client]. This submission uses the local MCP compatibility path rather than the Claude-hosted connector; the agent pipeline and grounding checks are reproducible.

Do not describe the local path as Hosted MCP.
