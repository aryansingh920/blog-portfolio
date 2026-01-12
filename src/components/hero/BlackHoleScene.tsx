/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  Preload,
  useGLTF,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import React, { Suspense, useMemo, useRef } from "react";

export type BlackHoleSceneProps = {
  progress: number; // 0..1
  enabled: boolean;
  modelUrl?: string;
  interactive?: boolean; // drag + pinch
};

/** Deterministic PRNG (pure). Same seed => same sequence. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string->u32 seed (pure). */
function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function BlackHoleModel({ url }: { url: string }) {
  const spin = useRef<THREE.Group>(null);
  const gltf = useGLTF(url) as any;

  const { scene, scale, offset } = useMemo(() => {
    const scene = gltf.scene.clone(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const target = 4.2;
    const scale = target / maxAxis;

    const offset: [number, number, number] = [-center.x, -center.y, -center.z];

    scene.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    return { scene, scale, offset };
  }, [gltf.scene]);

  useFrame((_, dt) => {
    const g = spin.current;
    if (!g) return;
    g.rotation.y += dt * 0.12;
    g.rotation.z += dt * 0.03;
  });

  return (
    <group ref={spin} scale={scale}>
      <group position={offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function ScrollRig({ progress }: { progress: number }) {
  const smooth = useRef(0);

  useFrame(({ camera }, dt) => {
    const SMOOTH = 1 - Math.pow(0.0008, dt);
    smooth.current = THREE.MathUtils.lerp(smooth.current, progress, SMOOTH);

    const p = smooth.current;
    const eased = p * p * (3 - 2 * p);

    const startZ = 9.5;
    const endZ = 3.2;

    const startFov = 42;
    const endFov = 28;

    camera.position.set(
      0.15 * (1 - eased),
      0.05 * (1 - eased),
      THREE.MathUtils.lerp(startZ, endZ, eased)
    );

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(startFov, endFov, eased);
    }
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function isLowEnd() {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as any).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  return mem <= 4 || cores <= 4;
}

function StarTunnel({
  progress,
  count = 1400,
  radius = 10,
  depth = 140,
  seed = 1337,
}: {
  progress: number;
  count?: number;
  radius?: number;
  depth?: number;
  seed?: number;
}) {
  const points = useRef<THREE.Points>(null);
  const smooth = useRef(0);
  const prev = useRef(0);

  const geom = useMemo(() => {
    const rng = mulberry32(seed);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const t = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius;
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      const z = -rng() * depth;
      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, radius, depth, seed]);

  const mat = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
  }, []);

  useFrame((_, dt) => {
    const p = points.current;
    if (!p) return;

    const SMOOTH = 1 - Math.pow(0.0008, dt);
    smooth.current = THREE.MathUtils.lerp(smooth.current, progress, SMOOTH);

    const cur = smooth.current;
    const dp = cur - prev.current;
    prev.current = cur;

    const base = 6.0;
    const impulse = THREE.MathUtils.clamp(Math.abs(dp) * 900, 0, 22);
    const speed = (base + impulse) * Math.sign(dp || 1);

    const attr = geom.getAttribute("position") as THREE.BufferAttribute;
    const a = attr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3 + 2;
      a[idx] += speed * dt;
      if (a[idx] > 1) a[idx] = -depth;
      if (a[idx] < -depth) a[idx] = 1;
    }

    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geom} material={mat} frustumCulled={false} />
  );
}

export default function BlackHoleScene({
  progress,
  enabled,
  modelUrl = "/models/black_hole.glb",
  interactive = true,
}: BlackHoleSceneProps) {
  if (!enabled) return null;

  const lowEnd = isLowEnd();

  // Stable seed (pure). Change string to change star pattern deterministically.
  const starSeed = useMemo(() => hashSeed("blackhole-starfield-v1"), []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        frameloop="always"
        dpr={1}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ position: [0.15, 0.05, 9.5], fov: 42, near: 0.1, far: 200 }}
      >
        <color attach="background" args={["#000000"]} />

        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 6, 6]} intensity={0.9} />

        <Suspense fallback={null}>
          {!lowEnd ? <Environment preset="night" /> : null}

          <StarTunnel
            progress={progress}
            count={2200}
            radius={12}
            depth={180}
            seed={starSeed}
          />

          <BlackHoleModel url={modelUrl} />
          <ScrollRig progress={progress} />

          {!lowEnd ? (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={0.35}
                luminanceThreshold={0.35}
                luminanceSmoothing={0.2}
              />
            </EffectComposer>
          ) : null}

          {interactive ? (
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.35}
              zoomSpeed={0.6}
              minDistance={3.0}
              maxDistance={12.0}
              target={[0, 0, 0]}
            />
          ) : null}

          <Preload />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/black_hole.glb");
