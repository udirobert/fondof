"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { createAmbientBed, type AmbientBed } from "@/lib/experience/ambient-bed";

interface AmbientToggleProps {
  progress: number;
  disabled?: boolean;
}

export function AmbientToggle({ progress, disabled }: AmbientToggleProps) {
  const bed = useRef<AmbientBed | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    bed.current = createAmbientBed();
    return () => bed.current?.stop();
  }, []);

  useEffect(() => {
    bed.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (disabled && on) {
      bed.current?.setMuted(true);
      setOn(false);
    }
  }, [disabled, on]);

  const toggle = async () => {
    if (disabled) return;
    const b = bed.current;
    if (!b) return;
    if (!b.started) {
      await b.start();
      b.setMuted(false);
      setOn(true);
      return;
    }
    const next = !on;
    b.setMuted(!next);
    setOn(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-paper/10 bg-mist/90 px-3 py-2 text-xs font-medium text-paper backdrop-blur-md hover:border-ember/40 hover:text-ember disabled:opacity-40 transition-colors"
      aria-pressed={on}
      aria-label={on ? "Mute ambient sound" : "Enable ambient sound"}
    >
      {on ? <Volume2 size={13} className="text-ember" /> : <VolumeX size={13} />}
      {on ? "Sound on" : "Sound"}
    </button>
  );
}
