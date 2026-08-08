import type { LLMProvider } from "@fondof/core";

/**
 * Create the appropriate LLM provider based on environment configuration.
 *
 * Priority:
 * 1. ANTHROPIC_API_KEY → Claude (premium, higher quality)
 * 2. CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN → Workers AI (free)
 * 3. Error if neither is set
 */
export function createLLM(): LLMProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    return createClaudeLLM();
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    return createWorkersAILLM();
  }

  // Helpful error with setup instructions
  throw new Error(
    "No LLM provider configured. Set one of:\n\n" +
      "  Free:    CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN\n" +
      "           (10,000 neurons/day free at workers.cloudflare.com)\n\n" +
      "  Premium: ANTHROPIC_API_KEY\n" +
      "           (Claude API at console.anthropic.com)\n"
  );
}

/**
 * Cloudflare Workers AI LLM provider (FREE).
 * Uses Llama 3.1 8B for idea extraction and composition.
 */
export function createWorkersAILLM(): LLMProvider {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for Workers AI.\n" +
        "Get these free at: https://dash.cloudflare.com"
    );
  }

  const model = process.env.FONDOF_MODEL ?? "@cf/meta/llama-3.1-8b-instruct";

  return {
    async chat(system: string, user: string): Promise<string> {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
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

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Workers AI error (${response.status}): ${error}`);
      }

      const data = (await response.json()) as {
        result?: { response?: string };
        errors?: Array<{ message: string }>;
      };

      if (data.errors?.length) {
        throw new Error(`Workers AI: ${data.errors[0].message}`);
      }

      return data.result?.response ?? "";
    },
  };
}

/**
 * Anthropic Claude LLM provider (premium).
 * Higher quality but requires paid API key.
 */
export function createClaudeLLM(): LLMProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required.");
  }

  return {
    async chat(system: string, user: string): Promise<string> {
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

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error (${response.status}): ${error}`);
      }

      const data = (await response.json()) as {
        content: { type: string; text: string }[];
      };

      const textBlock = data.content.find((b) => b.type === "text");
      if (!textBlock) {
        throw new Error("No text response from Claude");
      }

      return textBlock.text;
    },
  };
}
