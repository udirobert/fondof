"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || reducedMotion) return;

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
  }, [mounted, reducedMotion, rootRef]);

  if (!mounted || reducedMotion) return null;

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute top-0 left-0 -z-0"
      style={{ willChange: "transform" }}
      aria-hidden
    >
      <Canvas
        dpr={[1, 1.5]}
        shadows
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
  );
}
