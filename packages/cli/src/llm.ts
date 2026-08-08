import type { LLMProvider } from "@fondof/core";

/**
 * Anthropic Claude LLM provider.
 * Uses the Anthropic Messages API directly.
 * Requires ANTHROPIC_API_KEY environment variable.
 */
export function createClaudeLLM(): LLMProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required.\n" +
        "Set it with: export ANTHROPIC_API_KEY=sk-ant-..."
    );
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
