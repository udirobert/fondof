export default function SkillLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center pt-14">
      <div className="flex flex-col items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ember" />
        <p className="text-xs text-muted">Loading skill…</p>
      </div>
    </div>
  );
}
