import Link from "next/link";
import { Flame } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 pt-14 text-center">
      <p className="font-serif text-4xl text-ink">404</p>
      <p className="mt-2 text-sm text-foreground-secondary">
        This page doesn&apos;t exist — or the skill hasn&apos;t been forged yet.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-ember px-4 text-sm font-medium text-paper hover:bg-ember-hot"
      >
        <Flame size={14} />
        Forge a skill
      </Link>
    </div>
  );
}
