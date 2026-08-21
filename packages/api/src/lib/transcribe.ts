import type { Env } from "../index.js";
import { safeFetch, validateFetchTarget } from "./ssrf.js";

export interface TranscriptionResult {
  text: string;
  languageCode: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    speakerId?: string;
  }>;
}

/**
 * Transcribe audio from a URL using ElevenLabs Scribe v2.
 * Returns the full transcript text.
 */
export async function transcribeAudio(
  audioUrl: string,
  env: Env
): Promise<TranscriptionResult | null> {
  if (!env.ELEVENLABS_API_KEY) return null;
  if (await validateFetchTarget(audioUrl)) return null;

  try {
    // ElevenLabs Scribe supports cloud_storage_url for direct URL transcription
    const formData = new FormData();
    formData.append("model_id", "scribe_v2");
    formData.append("cloud_storage_url", audioUrl);
    formData.append("language_code", "eng");
    formData.append("timestamps_granularity", "word");
    formData.append("diarize", "true");
    formData.append("tag_audio_events", "true");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs transcription failed:", response.status, err);
      return null;
    }

    const data = (await response.json()) as {
      text?: string;
      language_code?: string;
      words?: Array<{
        text: string;
        start: number;
        end: number;
        type: string;
        speaker_id?: string;
      }>;
    };

    return {
      text: data.text ?? "",
      languageCode: data.language_code ?? "eng",
      words: data.words?.map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        speakerId: w.speaker_id,
      })),
    };
  } catch (err) {
    console.error("ElevenLabs transcription error:", err);
    return null;
  }
}

/**
 * Detect if a URL points to audio content.
 */
export function isAudioUrl(url: string): boolean {
  const audioExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma"];
  const audioHosts = [
    "podcasts.apple.com",
    "open.spotify.com",
    "anchor.fm",
    "feeds.simplecast.com",
    "feeds.buzzsprout.com",
    "feeds.transistor.fm",
    "traffic.libsyn.com",
    "media.blubrry.com",
    "feeds.megaphone.fm",
    "rss.art19.com",
  ];

  const lower = url.toLowerCase();
  if (audioExtensions.some((ext) => lower.endsWith(ext))) return true;

  try {
    const parsed = new URL(url);
    if (audioHosts.some((host) => parsed.hostname.includes(host))) return true;
  } catch {
    // Invalid URL
  }

  return false;
}

/**
 * Try to resolve the direct audio URL from a podcast page/RSS.
 */
export async function resolveAudioUrl(url: string): Promise<string | null> {
  try {
    const fetched = await safeFetch(url, {
      headers: { "User-Agent": "fondof/0.1" },
    });
    if (!fetched.ok) return null;
    const text = fetched.body;

    // Look for audio enclosure in RSS
    const enclosureMatch = text.match(/<enclosure[^>]+url=["']([^"']+)["']/);
    if (enclosureMatch) return enclosureMatch[1];

    // Look for audio source in HTML
    const audioMatch = text.match(/<(?:audio|source)[^>]+src=["']([^"']+\.(?:mp3|m4a|ogg|wav))["']/i);
    if (audioMatch) return audioMatch[1];

    // The URL itself might be the audio
    const contentType = fetched.headers.get("content-type") ?? "";
    if (contentType.startsWith("audio/")) return url;

    return null;
  } catch {
    return null;
  }
}
