/**
 * Client-side file download helper for skills and markdown artifacts.
 */

function slugFile(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "skill";
}

/**
 * Trigger browser file download of a skill markdown file.
 */
export function downloadSkillMarkdown(
  title: string,
  markdown: string,
  customFilename?: string,
) {
  if (typeof window === "undefined" || !markdown) return;

  const filename =
    customFilename ?? `${slugFile(title || "skill")}.skill.md`;

  const blob = new Blob([markdown], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
