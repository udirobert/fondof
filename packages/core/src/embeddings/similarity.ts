/**
 * Vector similarity operations for semantic matching.
 */

export interface SimilarityResult {
  /** Index into the target array */
  index: number;
  /** Cosine similarity score (0-1 for normalized vectors) */
  score: number;
}

/**
 * Compute cosine similarity between two vectors.
 * Assumes vectors are already L2-normalized (score will be in [-1, 1]).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  return dotProduct;
}

/**
 * Find the top-k most similar vectors from a set of candidates.
 */
export function findTopMatches(
  query: number[],
  candidates: number[][],
  topK = 5,
  minScore = 0.3
): SimilarityResult[] {
  if (query.length === 0 || candidates.length === 0) return [];

  const scores: SimilarityResult[] = candidates.map((candidate, index) => ({
    index,
    score: cosineSimilarity(query, candidate),
  }));

  return scores
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Compute the centroid (average) of multiple vectors.
 * Useful for generating a single repo embedding from multiple file embeddings.
 */
export function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const result = new Array<number>(dim).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i];
    }
  }

  // Average
  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length;
  }

  // L2 normalize
  const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      result[i] /= norm;
    }
  }

  return result;
}
