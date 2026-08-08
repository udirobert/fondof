"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraRigProps {
  progress: number;
}

const KEYFRAMES = [
  { p: 0, pos: new THREE.Vector3(0, 0.35, 8.2), look: new THREE.Vector3(0, 0, 0) },
  { p: 0.2, pos: new THREE.Vector3(1.1, 0.25, 7.4), look: new THREE.Vector3(0.4, 0, 0) },
  { p: 0.45, pos: new THREE.Vector3(0.2, 0.55, 5.8), look: new THREE.Vector3(0, 0.1, 0) },
  { p: 0.7, pos: new THREE.Vector3(-0.9, 0.3, 6.4), look: new THREE.Vector3(0.6, 0, 0) },
  { p: 1, pos: new THREE.Vector3(0, 0.4, 7.6), look: new THREE.Vector3(0, 0, 0) },
];

function sample(progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i < KEYFRAMES.length - 1 && KEYFRAMES[i + 1].p < p) i++;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];
  const span = Math.max(1e-5, b.p - a.p);
  const t = (p - a.p) / span;
  const ease = t * t * (3 - 2 * t);
  return {
    pos: a.pos.clone().lerp(b.pos, ease),
    look: a.look.clone().lerp(b.look, ease),
  };
}

/** Emotional Experiences-style camera authorship driven by scroll progress. */
export function CameraRig({ progress }: CameraRigProps) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());

  useFrame(() => {
    const { pos, look: target } = sample(progress);
    camera.position.lerp(pos, 0.06);
    look.current.lerp(target, 0.06);
    camera.lookAt(look.current);
  });

  return null;
}
