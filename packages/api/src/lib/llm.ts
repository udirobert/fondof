import type { Env } from "../index.js";

/**
 * Call the LLM via Workers AI.
 * Tries: AI binding first, then REST API, then external fallbacks.
 */
export async function chat(
  ai: Env["AI"],
  system: string,
  user: string,
  env?: Env
): Promise<string> {
  // Primary: AI binding (fastest when available)
  try {
    const result = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4096,
    }) as { response?: string };

    if (result.response) return result.response;
  } catch {
    // Log but don't fail — try REST next
  }

  // Fallback: REST API with explicit token
  if (env?.CF_API_TOKEN) {
    try {
      const response = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/e7383c0c7474c8f61cc06598eeb134a0/ai/run/@cf/meta/llama-3.1-8b-instruct",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            max_tokens: 4096,
          }),
        }
      );

      if (response.ok) {
        const data = (await response.json()) as { result?: { response?: string } };
        if (data.result?.response) return data.result.response;
      }
    } catch {
      // Fall through
    }
  }

  // Fallback 1: Venice (OpenAI-compatible)
  if (env?.VENICE_API_KEY) {
    try {
      return await openAICompatChat(
        "https://api.venice.ai/api/v1/chat/completions",
        env.VENICE_API_KEY,
        "llama-3.1-405b",
        system,
        user
      );
    } catch {
      // Venice unavailable
    }
  }

  // Fallback 2: NVIDIA
  if (env?.NVIDIA_API_KEY) {
    try {
      return await openAICompatChat(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        env.NVIDIA_API_KEY,
        "meta/llama-3.1-70b-instruct",
        system,
        user
      );
    } catch {
      // NVIDIA unavailable
    }
  }

  // Fallback 3: Anthropic
  if (env?.ANTHROPIC_API_KEY) {
    try {
      return await anthropicChat(env.ANTHROPIC_API_KEY, system, user);
    } catch {
      // Anthropic unavailable
    }
  }

  throw new Error("All LLM providers failed");
}

/**
 * Generate embeddings via Workers AI binding.
 */
export async function embed(ai: Env["AI"], texts: string[]): Promise<number[][]> {
  const result = await ai.run("@cf/baai/bge-small-en-v1.5", {
    text: texts,
  }) as { data: number[][] };

  return result.data;
}

async function openAICompatChat(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string
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

  if (!response.ok) throw new Error(`${response.status}`);
  const data = (await response.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

async function anthropicChat(apiKey: string, system: string, user: string): Promise<string> {
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
  const data = (await response.json()) as { content: { type: string; text: string }[] };
  return data.content.find((b) => b.type === "text")?.text ?? "";
}
