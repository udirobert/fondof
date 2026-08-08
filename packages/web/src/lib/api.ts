const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://fondof-api.trustfall.workers.dev";

export interface IdeaFromAPI {
  id: string;
  title: string;
  description: string;
  domain: string[];
  applicability: string[];
  patternType: "technique" | "mental-model" | "anti-pattern" | "architecture";
  sourceUrl: string;
  sourceHash: string;
  embedding: number[];
}

export interface IngestResponse {
  contentType: string;
  sourceHash: string;
  title: string;
  ideas: IdeaFromAPI[];
  textLength: number;
  error?: string;
}

export interface ForgeResponse {
  title: string;
  skillHash: string;
  sourceHashes: string[];
  markdown: string;
  fittedTo: string;
  composedAt: string;
  error?: string;
}

export interface PublishResponse {
  success: boolean;
  txHash: string;
  blockNumber: number;
  skillHash: string;
  explorer: string;
  error?: string;
}

export interface SkillOnChainResponse {
  skillHash: string;
  forger: string;
  backing: string;
  usageCount: number;
  challengeLosses: number;
  createdAt: number;
  signal: string;
  error?: string;
}

export async function ingestURL(url: string): Promise<IngestResponse> {
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function forgeSkill(
  ideas: Array<{ title: string; description: string; sourceUrl: string }>,
  repo?: { name: string; frameworks: string[]; languages: string[] }
): Promise<ForgeResponse> {
  const res = await fetch(`${API_URL}/api/forge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ideas, repo }),
  });
  return res.json();
}

export async function publishSkill(
  skillHash: string,
  sourceHashes: string[]
): Promise<PublishResponse> {
  const res = await fetch(`${API_URL}/api/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillHash, sourceHashes }),
  });
  return res.json();
}

export async function getSkillSignal(hash: string): Promise<SkillOnChainResponse> {
  const res = await fetch(`${API_URL}/api/skills/${hash}`);
  return res.json();
}

export async function recordUsage(hash: string): Promise<{ txHash: string }> {
  const res = await fetch(`${API_URL}/api/skills/${hash}/use`, {
    method: "POST",
  });
  return res.json();
}

export async function challengeSkill(
  skillHash: string
): Promise<{ txHash: string; explorer: string }> {
  const res = await fetch(`${API_URL}/api/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillHash }),
  });
  return res.json();
}
