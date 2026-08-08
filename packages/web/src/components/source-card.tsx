"use client";

interface SourceCardProps {
  type: "podcast" | "blog" | "text";
  title: string;
  author?: string;
  url: string;
  duration?: string;
  ideasCount?: number;
  isProcessing?: boolean;
}

export function SourceCard({
  type,
  title,
  author,
  url,
  duration,
  ideasCount,
  isProcessing,
}: SourceCardProps) {
  const icon = type === "podcast" ? "🎙️" : type === "blog" ? "📝" : "📄";

  return (
    <div className="w-64 rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/30 hover:bg-surface-raised">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{title}</h3>
          {author && <p className="text-xs text-muted truncate">{author}</p>}
        </div>
      </div>

      {duration && (
        <p className="mt-2 text-xs text-muted font-mono">{duration}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-muted">Processing...</span>
          </div>
        ) : ideasCount !== undefined ? (
          <span className="text-xs text-success font-medium">
            {ideasCount} idea{ideasCount !== 1 ? "s" : ""} extracted
          </span>
        ) : (
          <span className="text-xs text-muted">Ready</span>
        )}
      </div>

      <p className="mt-2 text-[10px] text-muted truncate font-mono">{url}</p>
    </div>
  );
}
