"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  BookOpen,
  Code2,
  CheckCircle2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  parseSkillSections,
  type SkillSection,
} from "@/lib/skill-sections";
import { downloadSkillMarkdown } from "@/lib/download";
import {
  EXPORT_TARGETS,
  formatForHarness,
  type ExportTarget,
} from "@/lib/skill-export";

export type SkillViewMode = "magic" | "inspect" | "raw";

function safeUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed, "https://fondof.netlify.app");
    if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:") {
      return trimmed;
    }
  } catch {
    // fall through
  }
  return "#";
}

interface SkillViewerProps {
  markdown: string;
  title?: string;
  repo?: string;
  initialMode?: SkillViewMode;
  showActions?: boolean;
  className?: string;
  onCopy?: () => void;
}

export function SkillViewer({
  markdown,
  title = "Skill",
  repo,
  initialMode = "magic",
  showActions = true,
  className = "",
  onCopy,
}: SkillViewerProps) {
  const [mode, setMode] = useState<SkillViewMode>(initialMode);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeHarness, setActiveHarness] = useState<string | null>(null);

  const sections = parseSkillSections(markdown);
  const reduce = useReducedMotion();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      onCopy?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    downloadSkillMarkdown(title, markdown);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  const handleCopyHarness = async (target: ExportTarget) => {
    const { content } = formatForHarness(markdown, title, target.id);
    try {
      await navigator.clipboard.writeText(content);
      setActiveHarness(target.id);
      window.setTimeout(() => {
        setActiveHarness(null);
        setExportOpen(false);
      }, 1500);
    } catch {
      // ignore
    }
  };

  if (!markdown) {
    return (
      <p className="text-[12px] text-muted">No skill content to display.</p>
    );
  }

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {/* ── Toolbar: Lens Switcher & Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/6 pb-2.5">
        {/* Lens switch */}
        <div
          role="tablist"
          aria-label="Skill view modes"
          className="inline-flex rounded-full border border-ink/10 bg-mist/60 p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "magic"}
            onClick={() => setMode("magic")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              mode === "magic"
                ? "bg-paper text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Sparkles size={12} className={mode === "magic" ? "text-ember" : "text-muted"} />
            <span>Document</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "inspect"}
            onClick={() => setMode("inspect")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              mode === "inspect"
                ? "bg-paper text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Layers size={12} className={mode === "inspect" ? "text-ember" : "text-muted"} />
            <span>Sections ({sections.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "raw"}
            onClick={() => setMode("raw")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              mode === "raw"
                ? "bg-paper text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <FileCode size={12} className={mode === "raw" ? "text-ember" : "text-muted"} />
            <span>Raw .md</span>
          </button>
        </div>

        {/* Quick Action buttons */}
        {showActions && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              title="Download SKILL.md to your computer"
              className="inline-flex min-h-7 items-center gap-1 rounded-lg border border-ink/10 bg-paper/80 px-2 py-1 text-[11px] text-ink transition-colors hover:border-ember/40 hover:bg-paper"
            >
              {downloaded ? (
                <Check size={12} className="text-emerald-600" />
              ) : (
                <Download size={12} className="text-muted" />
              )}
              <span>{downloaded ? "Saved" : "Download .md"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              title="Copy markdown to clipboard"
              className="inline-flex min-h-7 items-center gap-1 rounded-lg border border-ink/10 bg-paper/80 px-2 py-1 text-[11px] text-ink transition-colors hover:border-ember/40 hover:bg-paper"
            >
              {copied ? (
                <Check size={12} className="text-ember" />
              ) : (
                <Copy size={12} className="text-muted" />
              )}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            {/* Target Harness dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                title="Format for Cursor, Claude, Kiro, Copilot"
                aria-expanded={exportOpen}
                className="inline-flex min-h-7 items-center gap-1 rounded-lg border border-ink/10 bg-paper/80 px-2 py-1 text-[11px] text-muted transition-colors hover:border-ember/40 hover:text-ink"
              >
                <span>Harness</span>
                <ChevronDown size={11} className={exportOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              {exportOpen && (
                <div className="absolute right-0 z-30 mt-1.5 w-60 rounded-xl border border-ink/10 bg-paper p-1.5 shadow-lg backdrop-blur-md">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Copy for agent harness
                  </p>
                  <div className="space-y-0.5">
                    {EXPORT_TARGETS.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => void handleCopyHarness(target)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-mist/80"
                      >
                        <div>
                          <p className="font-medium text-ink">{target.label}</p>
                          <p className="text-[10px] text-muted">{target.path}</p>
                        </div>
                        {activeHarness === target.id ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-muted" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── View Body ── */}
      <AnimatePresence mode="wait">
        {mode === "magic" && (
          <motion.div
            key="magic"
            initial={reduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-3.5"
          >
            <MagicDocumentView sections={sections} repo={repo} />
          </motion.div>
        )}

        {mode === "inspect" && (
          <motion.div
            key="inspect"
            initial={reduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-1.5"
          >
            <InspectAccordionView sections={sections} reduce={!!reduce} />
          </motion.div>
        )}

        {mode === "raw" && (
          <motion.div
            key="raw"
            initial={reduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <RawMarkdownView markdown={markdown} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ✨ Magic View: Clean, editorial, fully formatted document
 */
function MagicDocumentView({
  sections,
  repo,
}: {
  sections: SkillSection[];
  repo?: string;
}) {
  if (sections.length === 0) {
    return (
      <p className="text-[12px] text-muted">No sections to preview yet.</p>
    );
  }

  return (
    <div className="space-y-3.5 text-ink">
      {repo && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted pb-1">
          <span>Target repo:</span>
          <span className="font-mono text-ink font-medium bg-mist/60 px-1.5 py-0.5 rounded border border-ink/8">
            {repo}
          </span>
        </div>
      )}
      {sections.map((section) => (
        <section
          key={section.id}
          className={`rounded-2xl border p-3.5 sm:p-4 transition-colors ${sectionCardStyle(
            section.kind,
          )}`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {sectionIcon(section.kind)}
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
                {section.title}
              </h4>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
              {kindLabel(section.kind)}
            </span>
          </div>

          <div className="mt-1.5">
            <FormattedSectionBody body={section.body} kind={section.kind} />
          </div>
        </section>
      ))}
    </div>
  );
}

function sectionCardStyle(kind: SkillSection["kind"]): string {
  switch (kind) {
    case "context":
      return "border-ink/10 bg-paper/90 shadow-xs";
    case "guidance":
      return "border-ink/10 bg-paper/90 shadow-xs";
    case "anti":
      return "border-amber-500/20 bg-amber-500/5";
    case "references":
      return "border-ink/8 bg-mist/40";
    case "depends":
      return "border-blue-500/20 bg-blue-500/5";
    case "gap":
      return "border-purple-500/20 bg-purple-500/5";
    default:
      return "border-ink/8 bg-paper/70";
  }
}

function sectionIcon(kind: SkillSection["kind"]) {
  switch (kind) {
    case "context":
      return <BookOpen size={13} className="text-muted" />;
    case "guidance":
      return <Code2 size={13} className="text-ember" />;
    case "anti":
      return <AlertTriangle size={13} className="text-amber-600" />;
    case "references":
      return <ExternalLink size={13} className="text-muted" />;
    case "depends":
      return <Layers size={13} className="text-blue-600" />;
    case "gap":
      return <Sparkles size={13} className="text-purple-600" />;
    default:
      return <BookOpen size={13} className="text-muted" />;
  }
}

/**
 * 🔍 Inspect View: Progressive disclosure accordion
 */
function InspectAccordionView({
  sections,
  reduce,
}: {
  sections: SkillSection[];
  reduce: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null);

  return (
    <ul className="space-y-1.5" aria-label="Skill sections">
      {sections.map((section) => {
        const open = openId === section.id;
        return (
          <li
            key={section.id}
            className="rounded-xl border border-ink/8 bg-paper/70"
          >
            <button
              type="button"
              onClick={() =>
                setOpenId((id) => (id === section.id ? null : section.id))
              }
              aria-expanded={open}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
            >
              <ChevronDown
                size={14}
                className={`mt-0.5 shrink-0 text-muted transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-ink">
                  {section.title}
                </span>
                {!open && (
                  <span className="mt-0.5 block truncate text-[11px] text-muted">
                    {section.excerpt}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-muted">
                {kindLabel(section.kind)}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="body"
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-ink/6 px-3.5 py-3">
                    <FormattedSectionBody
                      body={section.body}
                      kind={section.kind}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 💻 Raw View: Clean monospace preview with line numbers
 */
function RawMarkdownView({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const lines = markdown.split("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-mist/70">
      <div className="flex items-center justify-between border-b border-ink/8 bg-paper/90 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <FileCode size={13} className="text-muted" />
          <span className="font-mono text-[11px] text-muted">
            SKILL.md · {lines.length} lines · {(new Blob([markdown]).size / 1024).toFixed(1)} kB
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-muted hover:bg-mist hover:text-ink"
        >
          {copied ? <Check size={12} className="text-ember" /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy Raw"}</span>
        </button>
      </div>

      <div className="max-h-96 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
        <pre className="text-foreground-secondary whitespace-pre-wrap">
          {markdown}
        </pre>
      </div>
    </div>
  );
}

/**
 * Rich formatting renderer for section content (code blocks, markdown lists, links)
 */
function FormattedSectionBody({
  body,
  kind,
}: {
  body: string;
  kind: SkillSection["kind"];
}) {
  const parts = splitCodeBlocks(body);

  return (
    <div className="space-y-2.5">
      {parts.map((p, idx) => {
        if (p.type === "code") {
          return <CodeBlock key={idx} code={p.text} language={p.language} />;
        }
        return <ProseBlock key={idx} text={p.text} kind={kind} />;
      })}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative group overflow-hidden rounded-xl border border-ink/10 bg-mist/90">
      <div className="flex items-center justify-between border-b border-ink/6 bg-paper/60 px-3 py-1.5 text-[10px] font-mono text-muted">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code snippet"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted hover:bg-mist hover:text-ink"
        >
          {copied ? <Check size={11} className="text-ember" /> : <Copy size={11} />}
          <span>{copied ? "Copied" : "Copy snippet"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-ink whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function ProseBlock({
  text,
  kind,
}: {
  text: string;
  kind: SkillSection["kind"];
}) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-[12px] leading-relaxed text-foreground-secondary">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // List item bullet
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.slice(2);
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                kind === "anti" ? "bg-amber-500" : "bg-ink/40"
              }`} />
              <p className="flex-1 whitespace-pre-wrap">
                {renderInlineMarkdown(content)}
              </p>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Quick inline markdown renderer (bold, code, links)
 */
function renderInlineMarkdown(text: string) {
  // Regex to match markdown links: [text](url) or raw URLs
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderFormatting(text.slice(lastIndex, match.index)));
    }
    if (match[1] && match[2]) {
      // [text](url)
      parts.push(
        <a
          key={match.index}
          href={safeUrl(match[2])}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ember hover:underline inline-flex items-center gap-0.5"
        >
          {match[1]}
          <ExternalLink size={10} className="inline opacity-70" />
        </a>,
      );
    } else if (match[3]) {
      // raw url
      const url = match[3];
      parts.push(
        <a
          key={match.index}
          href={safeUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ember hover:underline inline-flex items-center gap-0.5 truncate max-w-[280px] align-bottom"
        >
          {url.replace(/^https?:\/\/(www\.)?/, "")}
          <ExternalLink size={10} className="inline opacity-70" />
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(renderFormatting(text.slice(lastIndex)));
  }

  return parts.length > 0 ? parts : renderFormatting(text);
}

function renderFormatting(text: string) {
  // Split on bold (**text**) and code (`code`)
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-mist/80 px-1 py-0.5 font-mono text-[11px] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function splitCodeBlocks(
  body: string,
): Array<{ type: "code" | "text"; text: string; language?: string }> {
  const out: Array<{ type: "code" | "text"; text: string; language?: string }> = [];
  const re = /```([\w]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(body))) {
    if (m.index > last) {
      const text = body.slice(last, m.index).trim();
      if (text) out.push({ type: "text", text });
    }
    out.push({
      type: "code",
      language: m[1] || undefined,
      text: m[2].trim(),
    });
    last = m.index + m[0].length;
  }

  const rest = body.slice(last).trim();
  if (rest) out.push({ type: "text", text: rest });
  if (out.length === 0) out.push({ type: "text", text: body });
  return out;
}

function kindLabel(kind: SkillSection["kind"]) {
  switch (kind) {
    case "guidance":
      return "code";
    case "anti":
      return "watch";
    case "references":
      return "cite";
    case "depends":
      return "dep";
    case "gap":
      return "delta";
    case "context":
      return "why";
    default:
      return "";
  }
}
