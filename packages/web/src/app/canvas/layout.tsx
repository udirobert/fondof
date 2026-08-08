import { Suspense } from "react";

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.5rem)] pt-14 items-center justify-center bg-parchment">
          <p className="text-sm text-muted">Opening canvas…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
