"use client";

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { SyncedScene } from "./synced-scene";
import {
  createScrollSyncState,
  sampleAnchors,
  type ScrollSyncState,
} from "@/lib/experience/scroll-sync";
import { experienceColors } from "@/lib/experience/materials";

interface ExperienceCanvasProps {
  progress: number;
  reducedMotion: boolean;
  /** Root that contains [data-gl-anchor] markers */
  rootRef: React.RefObject<HTMLElement | null>;
}

function ExperienceCanvasFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 flex items-start justify-center pt-[18vh] px-6">
      <div className="rounded-2xl border border-ember/15 bg-paper/55 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
        <div className="mx-auto mb-2 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rotate-45 rounded-[2px] bg-ember/70" />
          <span className="h-2 w-2 rotate-45 rounded-[2px] bg-novel/60" />
          <span className="h-2 w-2 rotate-45 rounded-[2px] bg-steel/60" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          The 3D layer is unavailable
        </p>
        <p className="mt-1 text-xs text-foreground-secondary">
          The source → ideas → skill story still works below.
        </p>
      </div>
    </div>
  );
}

class ExperienceCanvasBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <ExperienceCanvasFallback />;
    return this.props.children;
  }
}

/**
 * Lusion-style scroll-synced canvas:
 * position absolute, translate with scroll, vertical padding to avoid clipping.
 */
export function ExperienceCanvas({
  progress,
  reducedMotion,
  rootRef,
}: ExperienceCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sync = useRef<ScrollSyncState>(createScrollSyncState(0.25));
  const [mounted, setMounted] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    setMounted(true);
    const probe = document.createElement("canvas");
    let available = false;
    try {
      available = Boolean(
        probe.getContext("webgl2") ?? probe.getContext("webgl"),
      );
    } catch {
      available = false;
    }
    setWebglAvailable(available);
  }, []);

  useEffect(() => {
    if (!mounted || reducedMotion || !rootRef.current) return;
    const root = rootRef.current;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "600px 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [mounted, reducedMotion, rootRef]);

  useEffect(() => {
    if (!mounted || reducedMotion || !inView) return;

    const state = sync.current;
    let raf = 0;

    // Document-space top of the canvas root — non-zero when the landing sits
    // below the tool pad rather than at the top of the page.
    const rootOffset = () =>
      rootRef.current
        ? rootRef.current.getBoundingClientRect().top + window.scrollY
        : 0;

    const resize = () => {
      state.viewportWidth = window.innerWidth;
      state.viewportHeight = window.innerHeight;
      state.scrollX = window.scrollX;
      state.scrollY = window.scrollY;
      state.rootOffsetY = rootOffset();

      const canvasH = state.viewportHeight * (1 + state.padding * 2);
      if (wrapRef.current) {
        wrapRef.current.style.width = `${state.viewportWidth}px`;
        wrapRef.current.style.height = `${canvasH}px`;
      }
      sampleAnchors(state, rootRef.current ?? document);
    };

    const tick = () => {
      state.scrollX = window.scrollX;
      state.scrollY = window.scrollY;
      state.rootOffsetY = rootOffset();
      sampleAnchors(state, rootRef.current ?? document);

      // Canvas rides with the document — Lusion "no-fix" alternative with padding
      const y =
        state.scrollY - state.rootOffsetY - state.viewportHeight * state.padding;
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate3d(${state.scrollX}px, ${y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    const ro =
      typeof ResizeObserver !== "undefined" && rootRef.current
        ? new ResizeObserver(resize)
        : null;
    if (rootRef.current && ro) ro.observe(rootRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
    };
  }, [mounted, reducedMotion, inView, rootRef]);

  if (!mounted || reducedMotion || webglAvailable === null) return null;
  if (!webglAvailable) return <ExperienceCanvasFallback />;
  if (!inView) return null;

  return (
    <ExperienceCanvasBoundary>
      <div
        ref={wrapRef}
        className="pointer-events-none absolute top-0 left-0 -z-0"
        style={{ willChange: "transform" }}
        aria-hidden
      >
        <Canvas
          dpr={[1, 1.25]}
          shadows="percentage"
          camera={{ position: [0, 0.35, 8.2], fov: 42, near: 0.1, far: 40 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          style={{ width: "100%", height: "100%" }}
          onCreated={({ gl }) => {
            gl.setClearColor(experienceColors.parchment, 1);
          }}
        >
          <Suspense fallback={null}>
            <SyncedScene sync={sync} progress={progress} />
          </Suspense>
        </Canvas>
      </div>
    </ExperienceCanvasBoundary>
  );
}
