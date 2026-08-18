#!/usr/bin/env node
/**
 * ElevenLabs TTS for HyperFrames (REST, no Python SDK).
 * Reads ELEVENLABS_API_KEY from repo-root .env.
 *
 *   node scripts/elevenlabs-tts.mjs --project videos/day-1-vox-skill
 *
 * Writes assets/voice/NN.wav + audio_meta.json (frame-keyed, with word timings).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_VOICE = "SAz9YHcvj6GT2YYXdXww"; // River

function parseArgs(argv) {
  const out = {
    project: "videos/day-1-vox-skill",
    voice: DEFAULT_VOICE,
    model: "eleven_multilingual_v2",
    only: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project") out.project = argv[++i];
    else if (a === "--voice") out.voice = argv[++i];
    else if (a === "--model") out.model = argv[++i];
    else if (a === "--only")
      out.only = argv[++i].split(",").map((n) => Number(n.trim()));
    else throw new Error(`unknown arg ${a}`);
  }
  return out;
}

async function loadKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const raw = await readFile(join(ROOT, ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("ELEVENLABS_API_KEY=")) continue;
    let v = t.slice("ELEVENLABS_API_KEY=".length).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    return v;
  }
  return null;
}

function parseScript(md) {
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur && cur.text.trim()) out.push({ ...cur, text: cur.text.trim() });
    cur = null;
  };
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^#{2,3}\s+.*?\(frame\s+(\d+)\)/i);
    if (h) {
      flush();
      cur = { frame: Number(h[1]), text: "" };
      continue;
    }
    if (!cur) continue;
    if (/^\s*\*\*/.test(line)) continue;
    const m = line.match(/^(?: {4,}|\t)(.+)$/);
    if (m) cur.text += (cur.text ? " " : "") + m[1].trim();
  }
  flush();
  return out;
}

function wordsFromAlignment(text, alignment) {
  if (!alignment?.characters?.length) {
    const parts = text.split(/\s+/).filter(Boolean);
    const dur = 0;
    return { words: parts.map((t) => ({ id: t, text: t, start: 0, end: 0 })), duration: dur };
  }
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const words = [];
  let buf = "";
  let wStart = 0;
  let wEnd = 0;
  const flush = () => {
    const t = buf.trim();
    if (t) words.push({ id: t.replace(/[^\w'-]/g, "") || t, text: t, start: wStart, end: wEnd });
    buf = "";
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const s = starts[i] ?? 0;
    const e = ends[i] ?? s;
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (!buf) wStart = s;
    buf += ch;
    wEnd = e;
  }
  flush();
  const duration = ends.length ? ends[ends.length - 1] : 0;
  return { words, duration };
}

function ffmpegMp3ToWav(mp3Path, wavPath) {
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", mp3Path, "-ac", "1", "-ar", "44100", wavPath],
    { stdio: "ignore" },
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${mp3Path}`);
}

const args = parseArgs(process.argv.slice(2));
const key = await loadKey();
if (!key) {
  console.error("ELEVENLABS_API_KEY missing");
  process.exit(1);
}

const project = resolve(ROOT, args.project);
let script = parseScript(await readFile(join(project, "SCRIPT.md"), "utf8"));
if (!script.length) {
  console.error("no spoken lines in SCRIPT.md");
  process.exit(1);
}
if (args.only?.length) {
  script = script.filter((line) => args.only.includes(line.frame));
  if (!script.length) {
    console.error(`--only matched no SCRIPT.md frames`);
    process.exit(1);
  }
}

const metaPath = join(project, "audio_meta.json");
let existing = { bgm: null, bgm_pending: false, voices: [], sfx: [] };
if (existsSync(metaPath)) {
  try {
    existing = { ...existing, ...JSON.parse(await readFile(metaPath, "utf8")) };
  } catch {
    /* start fresh */
  }
}

const voiceDir = join(project, "assets", "voice");
await mkdir(voiceDir, { recursive: true });

const voices = [];
for (const line of script) {
  const id = String(line.frame).padStart(2, "0");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${args.voice}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        text: line.text,
        model_id: args.model,
        output_format: "mp3_44100_128",
      }),
    },
  );
  if (!res.ok) {
    console.error(`TTS ${id} ${res.status}: ${(await res.text()).slice(0, 600)}`);
    process.exit(1);
  }
  const json = await res.json();
  const b64 = json.audio_base64;
  if (!b64) {
    console.error(`TTS ${id}: no audio_base64`);
    process.exit(1);
  }
  const mp3Path = join(voiceDir, `${id}.mp3`);
  const wavPath = join(voiceDir, `${id}.wav`);
  await writeFile(mp3Path, Buffer.from(b64, "base64"));
  ffmpegMp3ToWav(mp3Path, wavPath);
  const { words, duration } = wordsFromAlignment(line.text, json.alignment);
  const duration_s = Number(
    (
      duration ||
      Number(
        spawnSync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=nw=1:nk=1",
          wavPath,
        ]).stdout.toString(),
      )
    ).toFixed(3),
  );
  voices.push({
    frame: line.frame,
    path: `assets/voice/${id}.wav`,
    duration_s,
    words: words.map((w) => ({
      id: w.id,
      text: w.text,
      start: Number(w.start.toFixed(3)),
      end: Number(w.end.toFixed(3)),
    })),
  });
  console.error(`voice ${id}: ${duration_s}s (${words.length} words)`);
}

const byFrame = new Map((existing.voices ?? []).map((v) => [v.frame, v]));
for (const v of voices) byFrame.set(v.frame, v);
const merged = [...byFrame.values()].sort((a, b) => a.frame - b.frame);
const meta = {
  bgm: existing.bgm ?? null,
  bgm_pending: existing.bgm_pending ?? false,
  voices: merged,
  sfx: existing.sfx ?? [],
};
await writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
console.error(`wrote audio_meta.json (${merged.length} voices, bgm ${meta.bgm ? "kept" : "none"})`);
