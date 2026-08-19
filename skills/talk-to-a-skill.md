# talk-to-a-skill

> Turn a fondof skill into a grounded, voice-first ElevenAgent that people can talk through.

## When to use

Use this after fondof has forged a skill from a source, need, or repository and you want to make that thinking conversational.

This is not a generic "chat with a document" workflow. The skill is the bridge:

```text
source → fondof ideas → fitted skill → ElevenAgent → spoken exploration
```

The agent should explain and apply the forged skill, not invent a second body of knowledge.

## Inputs

Provide as many as available:

- **Skill markdown** — the complete fondof skill artifact
- **Skill URL** — the public fondof page, when available
- **Source URLs** — original articles, podcasts, videos, repositories, or conversations
- **Target repository** — the codebase the skill was fitted for
- **Audience** — who will talk to the agent
- **Voice direction** — optional tone, pace, accent, or character
- **Agent name** — optional; derive a concise name if omitted

If only a public skill URL is available, fetch and inspect it before creating the agent. Do not silently replace missing source material with general model knowledge.

## Core workflow

### 1. Understand the skill

Extract:

- the skill's title and one-sentence promise
- the target repository and stack, if present
- the source and provenance links
- the core guidance and constraints
- anti-patterns and boundaries
- 3–5 questions the agent should answer well

Separate **source-backed facts** from **repo-specific recommendations**. Preserve both labels in the agent instructions.

### 2. Draft the agent contract before making changes

Prepare a short proposal containing:

- agent name
- first message
- voice direction
- system prompt
- knowledge/source summary
- grounding rules
- expected shareable/widget output

The system prompt should include:

```text
You are a conversational guide for the fondof skill: [TITLE].

Your job is to help the user understand and apply this skill to [TARGET REPO].
Use the supplied skill and provenance as the primary source of truth.
Explain the reasoning, then give concrete next steps.
When a question is outside the skill or sources, say so clearly.
Do not invent citations, repository facts, implementation results, or outcomes.
Distinguish source-backed guidance from repo-specific inference.
Ask one clarifying question when the target repo or user goal is ambiguous.
Prefer concise spoken answers, with one idea at a time.

Skill:
[SKILL MARKDOWN]

Sources:
[SOURCE URLS]

Public skill page:
[SKILL URL]
```

### 3. Get approval before destructive or public actions

Before calling a write-capable ElevenLabs MCP tool, show the proposed name, voice, first message, and system prompt. Ask for confirmation if the user did not explicitly request creation.

Never delete or overwrite an existing agent without explicit approval.

### 4. Use the ElevenLabs Hosted MCP connection

The challenge's intended path is the **ElevenLabs Hosted MCP** — a remote MCP server requiring no local installation.

**Endpoint:** `https://api.elevenlabs.io/v1/mcp`

**Connect in Claude Desktop:**
1. Open Claude Desktop → Settings → Integrations.
2. Find the ElevenLabs connector and sign in with OAuth.
3. The hosted server exposes agent-management tools including create, update, get config, retrieve shareable links, and generate voice samples.

**Connect in any other MCP client supporting remote HTTP + OAuth:**
```
Server URL: https://api.elevenlabs.io/v1/mcp
Auth: OAuth (ElevenLabs account)
```

Once connected, use the MCP tools to:

1. Create the ElevenAgent with the drafted system prompt and first message.
2. Set the chosen voice, language, and conversational style.
3. Add the source or knowledge material if the connected tools expose that capability.
4. Retrieve the agent configuration and shareable/widget link.
5. Generate a short voice sample when useful.

**Fallback — official local MCP server:**
If the client does not support the Hosted MCP connector, the official `elevenlabs-mcp` local server (`npx @elevenlabs/mcp`) provides the same conceptual pipeline. Disclose this clearly in any submission; local MCP is not the same connection path as Hosted MCP.

### 5. Run a grounding check

Ask the new agent at least these questions:

1. What is the main idea of this skill?
2. How does it apply to the target repository?
3. What should a developer avoid?

Record whether each answer is:

- grounded in the supplied skill/source
- clearly marked as an inference
- honest about missing information

If the agent hallucinates source facts or claims an outcome that has not happened, revise the prompt before sharing it.

### 6. Return a compact handoff manifest

```yaml
name: "[agent name]"
agent_id: "[ElevenAgent id]"
share_url: "[shareable/widget URL]"
skill_url: "[fondof skill URL]"
target_repo: "[owner/name]"
sources:
  - "[source URL]"
voice: "[voice name or id]"
status: "created | draft | needs-review"
grounding_checks:
  - question: "What is the main idea of this skill?"
    result: "pass | revise"
  - question: "How does it apply to the target repository?"
    result: "pass | revise"
  - question: "What should a developer avoid?"
    result: "pass | revise"
```

## Suggested first message

> You’re talking to a skill forged from [SOURCE]. I can explain the core idea, connect it to [TARGET REPO], quiz you on the important parts, or help you choose a first implementation step. What do you want to explore?

## Suggested challenge demo

Use one technical source, not an arbitrary knowledge base:

1. Paste a podcast, article, or GitHub repository into fondof.
2. Forge a skill fitted to `udirobert/fondof` or another real repo.
3. Copy the **Talk to a Skill** prompt into an MCP-capable agent.
4. Create the ElevenAgent through the ElevenLabs MCP.
5. Ask the agent how the skill applies to the repo.
6. End on the source → skill → voice agent chain.

## Honest boundaries

- A voice agent is a conversational interface to a skill, not proof that the skill improved a repository.
- SkillPool attestation and usage signals remain optional downstream proof.
- Do not call an agent "grounded" unless the grounding checks pass.
- Do not claim Hosted MCP usage when the local server was used; disclose the client and connection path in the submission.
