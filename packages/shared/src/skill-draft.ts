export interface SkillSource {
  /** URL of the source content */
  url: string;
  /** Specific segment (timestamp range or paragraph range) */
  segment: string;
  /** What this source contributed to the skill */
  contribution: string;
}

export interface SkillProvenance {
  /** SHA-256 hashes of all source content */
  sourceHashes: string[];
  /** ISO timestamp of when the skill was composed */
  composedAt: string;
  /** The repo this skill was fitted to */
  fittedTo: string;
}

export interface SkillDraft {
  /** Unique identifier */
  id: string;
  /** Skill title */
  title: string;
  /** Domain tags */
  domain: string[];
  /** Languages/frameworks this skill applies to */
  applicability: string[];
  /** Sources that contributed to this skill */
  sources: SkillSource[];
  /** Provenance metadata */
  provenance: SkillProvenance;
  /** The skill content sections */
  content: {
    /** When this skill applies and what it assumes */
    context: string;
    /** The actual guidance (patterns, techniques, decision criteria) */
    guidance: string;
    /** What to avoid */
    antiPatterns: string;
    /** Cited references */
    references: string;
  };
  /** The full rendered markdown of the skill */
  markdown: string;
}
