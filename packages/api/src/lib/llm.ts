import type { Env } from "../index.js";

/**
 * Call the LLM via Workers AI.
 * Tries: AI binding → CF REST → Venice → NVIDIA → Anthropic.
 */
export async function chat(
  ai: Env["AI"],
  system: string,
  user: string,
  env?: Env,
): Promise<string> {
  const errors: string[] = [];

  // Primary: AI binding
  try {
    const result = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4096,
    });
    const text = extractModelText(result);
    if (text) return text;
    errors.push("ai-binding: empty response");
  } catch (e) {
    errors.push(`ai-binding: ${errMsg(e)}`);
  }

  // Fallback: REST API (secret may be CF_API_TOKEN or CLOUDFLARE_API_TOKEN)
  const cfToken = env?.CF_API_TOKEN || env?.CLOUDFLARE_API_TOKEN;
  if (cfToken) {
    try {
      const response = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/e7383c0c7474c8f61cc06598eeb134a0/ai/run/@cf/meta/llama-3.1-8b-instruct",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            max_tokens: 4096,
          }),
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        errors?: { message?: string }[];
        result?: unknown;
      };

      if (!response.ok || data.success === false) {
        const msg =
          data.errors?.map((x) => x.message).filter(Boolean).join("; ") ||
          `HTTP ${response.status}`;
        errors.push(`cf-rest: ${msg}`);
      } else {
        const text = extractModelText(data.result);
        if (text) return text;
        errors.push("cf-rest: empty response");
      }
    } catch (e) {
      errors.push(`cf-rest: ${errMsg(e)}`);
    }
  } else {
    errors.push("cf-rest: no CF_API_TOKEN / CLOUDFLARE_API_TOKEN");
  }

  // Venice (OpenAI-compatible) — model id must match Venice catalog
  if (env?.VENICE_API_KEY) {
    try {
      return await openAICompatChat(
        "https://api.venice.ai/api/v1/chat/completions",
        env.VENICE_API_KEY,
        "llama-3.3-70b",
        system,
        user,
      );
    } catch (e) {
      errors.push(`venice: ${errMsg(e)}`);
    }
  } else {
    errors.push("venice: no VENICE_API_KEY");
  }

  if (env?.NVIDIA_API_KEY) {
    try {
      return await openAICompatChat(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        env.NVIDIA_API_KEY,
        "meta/llama-3.1-70b-instruct",
        system,
        user,
      );
    } catch (e) {
      errors.push(`nvidia: ${errMsg(e)}`);
    }
  }

  if (env?.ANTHROPIC_API_KEY) {
    try {
      return await anthropicChat(env.ANTHROPIC_API_KEY, system, user);
    } catch (e) {
      errors.push(`anthropic: ${errMsg(e)}`);
    }
  }

  throw new Error(`All LLM providers failed (${errors.join(" | ")})`);
}

/** Normalize Workers AI / OpenAI-shaped payloads into plain text. */
function extractModelText(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string" && payload.trim()) return payload;

  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (typeof obj.response === "string" && obj.response.trim()) {
      return obj.response;
    }

    const choices = obj.choices;
    if (Array.isArray(choices) && choices[0]) {
      const choice = choices[0] as Record<string, unknown>;
      const message = choice.message as Record<string, unknown> | undefined;
      if (typeof message?.content === "string" && message.content.trim()) {
        return message.content;
      }
      if (typeof choice.text === "string" && choice.text.trim()) {
        return choice.text;
      }
    }
  }

  return null;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Generate embeddings via Workers AI binding.
 */
export async function embed(
  ai: Env["AI"],
  texts: string[],
): Promise<number[][]> {
  const result = (await ai.run("@cf/baai/bge-small-en-v1.5", {
    text: texts,
  })) as { data: number[][] };

  return result.data;
}

async function openAICompatChat(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4096,
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string } | string;
    choices?: { message?: { content?: string } }[];
  };

  if (!response.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || `${response.status}`;
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty choices");
  return content;
}

async function anthropicChat(
  apiKey: string,
  system: string,
  user: string,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) throw new Error(`${response.status}`);
  const data = (await response.json()) as {
    content: { type: string; text: string }[];
  };
  return data.content.find((b) => b.type === "text")?.text ?? "";
}
