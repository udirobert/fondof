/**
 * Embedding provider using Cloudflare Workers AI (bge-small-en-v1.5).
 * Free tier: included in 10,000 neurons/day allocation.
 * Output: 384-dimensional dense vectors.
 */

export interface EmbeddingProvider {
  /** Generate an embedding for a single text */
  embed(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts (batched for efficiency) */
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Create an embedding provider using Cloudflare Workers AI.
 * Uses bge-small-en-v1.5 (384 dimensions, fast, free).
 *
 * Falls back to a simple hash-based embedding if CF credentials are missing
 * (allows offline development with degraded quality).
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    // Offline fallback: deterministic hash-based pseudo-embeddings
    return createFallbackProvider();
  }

  return createWorkersAIProvider(accountId, apiToken);
}

function createWorkersAIProvider(accountId: string, apiToken: string): EmbeddingProvider {
  const model = "@cf/baai/bge-small-en-v1.5";
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  return {
    async embed(text: string): Promise<number[]> {
      const results = await callEmbeddingAPI(endpoint, apiToken, [text]);
      return results[0];
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      // CF Workers AI supports batching up to 100 texts
      const results: number[][] = [];
      const batchSize = 100;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await callEmbeddingAPI(endpoint, apiToken, batch);
        results.push(...batchResults);
      }

      return results;
    },
  };
}

async function callEmbeddingAPI(
  endpoint: string,
  apiToken: string,
  texts: string[]
): Promise<number[][]> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    result?: { data: number[][] };
    errors?: Array<{ message: string }>;
  };

  if (data.errors?.length) {
    throw new Error(`Embedding API: ${data.errors[0].message}`);
  }

  return data.result?.data ?? [];
}

/**
 * Fallback: deterministic pseudo-embeddings for offline development.
 * Uses a simple hash-based approach — NOT semantically meaningful,
 * but allows the pipeline to run without API credentials.
 */
function createFallbackProvider(): EmbeddingProvider {
  return {
    async embed(text: string): Promise<number[]> {
      return hashEmbed(text);
    },
    async embedBatch(texts: string[]): Promise<number[][]> {
      return texts.map(hashEmbed);
    },
  };
}

function hashEmbed(text: string): number[] {
  const dim = 384;
  const embedding = new Array<number>(dim);
  const normalized = text.toLowerCase().trim();

  // Simple deterministic hash → vector
  let seed = 0;
  for (let i = 0; i < normalized.length; i++) {
    seed = ((seed << 5) - seed + normalized.charCodeAt(i)) | 0;
  }

  for (let i = 0; i < dim; i++) {
    seed = ((seed * 1664525 + 1013904223) | 0) >>> 0;
    embedding[i] = (seed / 4294967296) * 2 - 1; // normalize to [-1, 1]
  }

  // L2 normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  for (let i = 0; i < dim; i++) {
    embedding[i] /= norm;
  }

  return embedding;
}

// Exported via function declaration above
