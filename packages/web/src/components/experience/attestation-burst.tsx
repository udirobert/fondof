"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { experienceColors } from "@/lib/experience/materials";

type Shard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  life: number;
  kind: "paper" | "ember";
};

interface AttestationBurstProps {
  /** Play once when true */
  active: boolean;
  onDone?: () => void;
  /** Headline over the burst */
  label?: string;
}

/**
 * Attestation celebration — paper shards + ember sparks (not confetti).
 * One peak moment for SkillPool publish.
 */
export function AttestationBurst({
  active,
  onDone,
  label = "Attested on Monad",
}: AttestationBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);

    if (reduceMotion) {
      const t = window.setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 900);
      return () => window.clearTimeout(t);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cx = w / 2;
    const cy = h * 0.42;

    const shards: Shard[] = [];
    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
      const speed = 2.2 + Math.random() * 4.5;
      shards.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        w: 8 + Math.random() * 18,
        h: 5 + Math.random() * 10,
        life: 1,
        kind: "paper",
      });
    }
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      shards.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rot: 0,
        vr: 0,
        w: 2 + Math.random() * 3,
        h: 2 + Math.random() * 3,
        life: 1,
        kind: "ember",
      });
    }

    const start = performance.now();
    const DURATION = 1400;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      ctx.clearRect(0, 0, w, h);

      // Soft parchment flash
      const flash = Math.max(0, 1 - t * 2.2);
      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 250, 242, ${0.35 * flash})`;
        ctx.fillRect(0, 0, w, h);
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 180);
        g.addColorStop(0, `rgba(196, 90, 42, ${0.28 * flash})`);
        g.addColorStop(1, "rgba(196, 90, 42, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      for (const s of shards) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += s.kind === "ember" ? 0.08 : 0.12;
        s.vx *= 0.99;
        s.rot += s.vr;
        s.life = Math.max(0, 1 - t * (s.kind === "ember" ? 1.15 : 0.95));

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.globalAlpha = s.life;
        if (s.kind === "paper") {
          ctx.fillStyle =
            Math.random() > 0.5
              ? experienceColors.paper
              : experienceColors.mist;
          ctx.strokeStyle = "rgba(42, 36, 28, 0.12)";
          ctx.lineWidth = 0.5;
          ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
          ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
        } else {
          ctx.fillStyle = experienceColors.ember;
          ctx.beginPath();
          ctx.arc(0, 0, s.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setVisible(false);
        onDone?.();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [active, reduceMotion, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <motion.div
            className="relative z-10 px-6 text-center"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-serif text-2xl text-ink sm:text-3xl">{label}</p>
            <p className="mt-1.5 font-mono text-[11px] tracking-wide text-ember">
              SkillPool · signal live
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
