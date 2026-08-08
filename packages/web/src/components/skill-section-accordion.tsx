"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  parseSkillSections,
  type SkillSection,
} from "@/lib/skill-sections";

interface SkillSectionAccordionProps {
  markdown: string;
  className?: string;
}

/**
 * Progressive disclosure for long skill drafts — one section open at a time.
 */
export function SkillSectionAccordion({
  markdown,
  className = "",
}: SkillSectionAccordionProps) {
  const sections = parseSkillSections(markdown);
  const reduce = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);

  if (sections.length === 0) {
    return (
      <p className="text-[12px] text-muted">No sections to preview yet.</p>
    );
  }

  return (
    <ul className={`space-y-1.5 ${className}`} aria-label="Skill sections">
      {sections.map((section) => (
        <SectionRow
          key={section.id}
          section={section}
          open={openId === section.id}
          reduce={!!reduce}
          onToggle={() =>
            setOpenId((id) => (id === section.id ? null : section.id))
          }
        />
      ))}
    </ul>
  );
}

function SectionRow({
  section,
  open,
  reduce,
  onToggle,
}: {
  section: SkillSection;
  open: boolean;
  reduce: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="rounded-xl border border-ink/8 bg-paper/70">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
      >
        <ChevronDown
          size={14}
          className={`mt-0.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
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
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink/6 px-3 py-2.5">
              <SectionBody body={section.body} kind={section.kind} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
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

function SectionBody({
  body,
  kind,
}: {
  body: string;
  kind: SkillSection["kind"];
}) {
  if (kind === "guidance") {
    const parts = splitCode(body);
    return (
      <div className="space-y-2">
        {parts.map((p, i) =>
          p.type === "code" ? (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-mist/80 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink"
            >
              {p.text}
            </pre>
          ) : (
            <p
              key={i}
              className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground-secondary"
            >
              {p.text}
            </p>
          ),
        )}
      </div>
    );
  }

  return (
    <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground-secondary">
      {body}
    </p>
  );
}

function splitCode(body: string): Array<{ type: "code" | "text"; text: string }> {
  const out: Array<{ type: "code" | "text"; text: string }> = [];
  const re = /```[\w]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) {
      const text = body.slice(last, m.index).trim();
      if (text) out.push({ type: "text", text });
    }
    out.push({ type: "code", text: m[1].trim() });
    last = m.index + m[0].length;
  }
  const rest = body.slice(last).trim();
  if (rest) out.push({ type: "text", text: rest });
  if (out.length === 0) out.push({ type: "text", text: body });
  return out;
}
