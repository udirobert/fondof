"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceColors } from "@/lib/experience/materials";

const vertexShader = /* glsl */ `
  uniform float uFold;
  uniform float uTime;
  varying vec2 vUv;
  varying float vCrease;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Two diagonal crease folds — paper origami feel
    float creaseA = smoothstep(0.0, 1.0, 1.0 - abs(uv.x + uv.y - 1.0) * 2.2);
    float creaseB = smoothstep(0.0, 1.0, 1.0 - abs(uv.x - uv.y) * 2.4);
    vCrease = max(creaseA, creaseB);

    float fold = uFold;
    pos.z += sin((uv.x - 0.5) * 3.14159) * fold * 0.35;
    pos.z += cos((uv.y - 0.5) * 3.14159) * fold * 0.22;
    pos.xy *= mix(1.0, 0.55, fold);
    pos.z += vCrease * fold * 0.18;
    pos.y += sin(uTime * 0.8 + uv.x * 4.0) * 0.02 * (1.0 - fold);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uFold;
  uniform float uOpacity;
  uniform vec3 uPaper;
  uniform vec3 uEmber;
  varying vec2 vUv;
  varying float vCrease;

  void main() {
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, vUv.y)
      * smoothstep(0.0, 0.08, 1.0 - vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.y);
    vec3 col = mix(uPaper, uEmber, vCrease * uFold * 0.85);
    col *= 0.88 + vCrease * 0.2;
    float alpha = uOpacity * edge;
    gl_FragColor = vec4(col, alpha);
  }
`;

interface OrigamiShardProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  fold: number;
  opacity: number;
}

export function OrigamiShard({
  position,
  rotation,
  scale,
  fold,
  opacity,
}: OrigamiShardProps) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uFold: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPaper: { value: new THREE.Color(experienceColors.paper) },
      uEmber: { value: new THREE.Color(experienceColors.ember) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uFold.value = fold;
    mat.current.uniforms.uOpacity.value = opacity;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={position} rotation={rotation} scale={[scale * 1.15, scale * 0.85, 1]}>
      <planeGeometry args={[1, 1, 24, 24]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
