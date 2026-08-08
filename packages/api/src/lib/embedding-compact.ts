/** Shrink embedding for cache / client without killing cosine utility. */
export function compactEmbedding(
  values: number[],
  dims = 32,
): number[] {
  if (!values.length) return [];
  const out: number[] = [];
  const step = Math.max(1, values.length / dims);
  for (let i = 0; i < dims; i++) {
    const idx = Math.min(values.length - 1, Math.floor(i * step));
    out.push(values[idx] ?? 0);
  }
  let norm = 0;
  for (const v of out) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return out.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}
