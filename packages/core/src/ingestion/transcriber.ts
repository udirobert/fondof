import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  type: string;
  speakerId?: string;
}

export interface TranscriptSegment {
  /** Speaker identifier (e.g. "speaker_0") */
  speakerId: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** The text spoken in this segment */
  text: string;
}

export interface TranscriptionResult {
  /** Full transcript text */
  fullText: string;
  /** Detected language */
  languageCode: string;
  /** Word-level timestamps */
  words: TranscriptWord[];
  /** Speaker-diarized segments */
  segments: TranscriptSegment[];
}

export interface TranscribeOptions {
  /** Direct URL to the audio file */
  audioUrl: string;
  /** Optional language hint (ISO 639-3, e.g. "eng") */
  languageCode?: string;
  /** Domain-specific terms to improve recognition */
  keyterms?: string[];
}

/**
 * Transcribe audio using ElevenLabs Scribe v2.
 * Supports speaker diarization and word-level timestamps.
 */
export async function transcribe(options: TranscribeOptions): Promise<TranscriptionResult> {
  const client = new ElevenLabsClient();

  const result = await client.speechToText.convert({
    cloudStorageUrl: options.audioUrl,
    modelId: "scribe_v2",
    languageCode: options.languageCode ?? "eng",
    timestampsGranularity: "word",
    diarize: true,
    tagAudioEvents: true,
    keyterms: options.keyterms,
  });

  const words: TranscriptWord[] = (result.words ?? []).map((w) => ({
    text: w.text,
    start: w.start ?? 0,
    end: w.end ?? 0,
    type: w.type ?? "word",
    speakerId: w.speakerId ?? undefined,
  }));

  // Group words into speaker segments
  const segments = groupWordsIntoSegments(words);

  return {
    fullText: result.text ?? "",
    languageCode: result.languageCode ?? "eng",
    words,
    segments,
  };
}

/**
 * Group consecutive words by the same speaker into segments.
 */
function groupWordsIntoSegments(words: TranscriptWord[]): TranscriptSegment[] {
  if (words.length === 0) return [];

  const segments: TranscriptSegment[] = [];
  let currentSpeaker = words[0].speakerId ?? "unknown";
  let segmentStart = words[0].start;
  let segmentWords: string[] = [];

  for (const word of words) {
    const speaker = word.speakerId ?? "unknown";

    if (speaker !== currentSpeaker) {
      // Flush current segment
      segments.push({
        speakerId: currentSpeaker,
        startTime: segmentStart,
        endTime: words[words.indexOf(word) - 1]?.end ?? segmentStart,
        text: segmentWords.join(" ").trim(),
      });

      // Start new segment
      currentSpeaker = speaker;
      segmentStart = word.start;
      segmentWords = [];
    }

    if (word.type === "word") {
      segmentWords.push(word.text);
    }
  }

  // Flush final segment
  if (segmentWords.length > 0) {
    segments.push({
      speakerId: currentSpeaker,
      startTime: segmentStart,
      endTime: words[words.length - 1].end,
      text: segmentWords.join(" ").trim(),
    });
  }

  return segments;
}
