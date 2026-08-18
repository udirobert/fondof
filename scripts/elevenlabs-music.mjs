#!/usr/bin/env node
/**
 * Generate an instrumental BGM bed via ElevenLabs Music API (POST /v1/music).
 * Reads ELEVENLABS_API_KEY from repo-root .env — never prints the key.
 *
 *   node scripts/elevenlabs-music.mjs --out videos/<project>/assets/bgm/track.mp3 \
 *     --duration-ms 90000 --prompt "restrained documentary underscore, no vocals"
 *
 * HyperFrames: set STORYBOARD music mood, then point the composition at the
 * generated file (adopt into assets/bgm/). Paid ElevenLabs plan required.
 *
 * Docs: https://elevenlabs.io/docs/api-reference/music/compose
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const API = "https://api.elevenlabs.io/v1/music";

const DEFAULT_PROMPT =
  "Instrumental documentary underscore for a developer explainer. Warm analog pads, light percussion, restrained pulse, no vocals, no lyrics, no melody that competes with speech. 90–110 bpm, cinematic but quiet under voiceover.";

function parseArgs(argv) {
  const out = {
    prompt: DEFAULT_PROMPT,
    durationMs: 90_000,
    out: "assets/bgm/track.mp3",
    model: "music_v2",
    instrumental: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--prompt") out.prompt = next();
    else if (a === "--duration-ms") out.durationMs = Number(next());
    else if (a === "--duration-s") out.durationMs = Math.round(Number(next()) * 1000);
    else if (a === "--out") out.out = next();
    else if (a === "--model") out.model = next();
    else if (a === "--vocals") out.instrumental = false;
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`unknown arg: ${a}`);
  }
  return out;
}

async function loadEnvKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const raw = await readFile(resolve(ROOT, ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (k === "ELEVENLABS_API_KEY" && v) return v;
  }
  return null;
}

function usage() {
  console.log(`Usage: node scripts/elevenlabs-music.mjs --out <file.mp3> [options]

  --out <path>           Output mp3 (default: assets/bgm/track.mp3)
  --prompt <text>        Music prompt (default: quiet instrumental explainer bed)
  --duration-ms <n>      3000–600000 (default: 90000)
  --duration-s <n>       Same, in seconds
  --model <id>           music_v1 | music_v2 (default: music_v2)
  --vocals               Allow vocals (default: force instrumental for VO beds)
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

if (!Number.isFinite(args.durationMs) || args.durationMs < 3000 || args.durationMs > 600_000) {
  console.error("duration must be 3000–600000 ms");
  process.exit(1);
}

const key = await loadEnvKey();
if (!key) {
  console.error("ELEVENLABS_API_KEY missing (set in gitignored .env)");
  process.exit(1);
}

const outPath = resolve(ROOT, args.out);
await mkdir(dirname(outPath), { recursive: true });

const body = {
  prompt: args.prompt,
  music_length_ms: args.durationMs,
  model_id: args.model,
  force_instrumental: args.instrumental,
};

const res = await fetch(`${API}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: {
    "xi-api-key": key,
    "Content-Type": "application/json",
    Accept: "audio/mpeg",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const errText = await res.text();
  console.error(`ElevenLabs Music ${res.status}: ${errText.slice(0, 800)}`);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
if (buf.length < 1000) {
  console.error("response too small to be audio");
  process.exit(1);
}

await writeFile(outPath, buf);
const metaPath = outPath.replace(/\.mp3$/i, ".json");
await writeFile(
  metaPath,
  JSON.stringify(
    {
      provider: "elevenlabs-music",
      model: args.model,
      duration_ms: args.durationMs,
      force_instrumental: args.instrumental,
      prompt: args.prompt,
      bytes: buf.length,
      created_at: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);

console.error(`wrote ${outPath} (${buf.length} bytes, ${args.durationMs} ms)`);
console.error(`meta  ${metaPath}`);
