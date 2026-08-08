"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { OrigamiFold } from "./origami-fold";
import { experienceColors } from "@/lib/experience/materials";

interface OrigamiRitualCanvasProps {
  /** Auto-play fold 0→1 */
  playing: boolean;
  durationMs?: number;
}

export function OrigamiRitualCanvas({
  playing,
  durationMs = 1200,
}: OrigamiRitualCanvasProps) {
  const [fold, setFold] = useState(0);

  useEffect(() => {
    if (!playing) {
      setFold(0);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFold(1);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease in-out
      const eased = t * t * (3 - 2 * t);
      setFold(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, durationMs]);

  return (
    <div className="h-44 w-56">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [1.6, 1.4, 2.4], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#00000000"]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 4, 2]} intensity={1} color="#f0e6d6" />
          <pointLight
            position={[-1, 1.5, 2]}
            intensity={1.2 + fold}
            color={experienceColors.ember}
          />
          <OrigamiFold fold={fold} scale={1.15} />
          <ContactShadows
            position={[0, -0.85, 0]}
            opacity={0.4}
            scale={6}
            blur={2}
            far={3}
          />
          <Environment preset="night" environmentIntensity={0.3} />
        </Suspense>
      </Canvas>
    </div>
  );
}
