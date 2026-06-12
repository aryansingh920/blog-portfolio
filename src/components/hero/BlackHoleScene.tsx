/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Preload, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import React, { Suspense, useMemo, useRef } from "react";

export type BlackHoleSceneProps = {
  progress: number;
  enabled: boolean;
  modelUrl?: string;
  interactive?: boolean;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

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

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Shaders ──────────────────────────────────────────────────────────────────

// Accretion disk: particles orbit via Keplerian motion computed entirely in GPU
const DISK_VERT = /* glsl */ `
attribute float a_r;
attribute float a_theta0;
attribute float a_omega;
attribute float a_sz;
attribute float a_bright;
uniform float u_t;
varying vec3 v_col;
varying float v_a;

void main() {
  float theta = a_theta0 + a_omega * u_t;

  // Slight disk thickness — warps to simulate magnetic field lines
  float warp = sin(theta * 3.0 + a_r * 1.8) * 0.05 * max(0.0, 1.0 - (a_r - 1.5) / 5.5);
  vec3 pos = vec3(a_r * cos(theta), warp, a_r * sin(theta));

  // Temperature gradient: inner = white-hot, mid = orange, outer = dark red
  float t = clamp((a_r - 1.5) / 5.5, 0.0, 1.0);
  vec3 c0 = vec3(1.00, 0.92, 0.78);
  vec3 c1 = vec3(1.00, 0.48, 0.06);
  vec3 c2 = vec3(0.50, 0.08, 0.01);
  vec3 col = (t < 0.38) ? mix(c0, c1, t / 0.38) : mix(c1, c2, (t - 0.38) / 0.62);

  // Relativistic Doppler beaming: side orbiting toward camera appears brighter
  float doppler = 1.0 + 0.60 * (-cos(theta));
  col *= a_bright * max(0.08, doppler);

  v_col = col;
  v_a   = a_bright * (1.0 - t * 0.6);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = a_sz * (220.0 / -mvPos.z);
  gl_Position  = projectionMatrix * mvPos;
}`;

const DISK_FRAG = /* glsl */ `
varying vec3 v_col;
varying float v_a;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = (1.0 - r * 2.0);
  a = a * a * v_a;
  gl_FragColor = vec4(v_col, a);
}`;

// Polar jets: relativistic plasma cones along ±Y axis
const JET_VERT = /* glsl */ `
attribute float a_t;
attribute float a_phi;
attribute float a_spd;
attribute float a_side;
attribute float a_bright;
uniform float u_time;
varying vec3 v_col;
varying float v_a;

void main() {
  float flow  = fract(a_t + u_time * a_spd * 0.15);
  float y     = flow * 8.5 * a_side;
  float spread = flow * 0.55;
  vec3 pos = vec3(cos(a_phi) * spread, y, sin(a_phi) * spread);

  float fade = (1.0 - flow) * (1.0 - flow);
  v_col = mix(vec3(0.45, 0.72, 1.0), vec3(1.0, 0.96, 1.0), 1.0 - flow) * a_bright;
  v_a   = fade * a_bright;

  vec4 mvPos  = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (2.2 - flow * 1.2) * (160.0 / -mvPos.z);
  gl_Position  = projectionMatrix * mvPos;
}`;

const JET_FRAG = /* glsl */ `
varying vec3 v_col;
varying float v_a;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = (1.0 - r * 2.0) * (1.0 - r * 2.0) * v_a;
  gl_FragColor = vec4(v_col, a);
}`;

// Nebula cloud: colored particle puff with soft falloff
const NEBULA_VERT = /* glsl */ `
attribute vec3 a_col;
attribute float a_sz;
attribute float a_alpha;
varying vec3 v_col;
varying float v_a;

void main() {
  v_col = a_col;
  v_a   = a_alpha;
  vec4 mvPos  = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = a_sz * (600.0 / -mvPos.z);
  gl_Position  = projectionMatrix * mvPos;
}`;

const NEBULA_FRAG = /* glsl */ `
varying vec3 v_col;
varying float v_a;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = (0.5 - r) * 0.65 * v_a;
  gl_FragColor = vec4(v_col, a);
}`;

// Colored star tunnel with size variation
const STAR_VERT = /* glsl */ `
attribute vec3 a_col;
attribute float a_sz;
varying vec3 v_col;

void main() {
  v_col = a_col;
  vec4 mvPos  = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = a_sz * (100.0 / -mvPos.z);
  gl_Position  = projectionMatrix * mvPos;
}`;

const STAR_FRAG = /* glsl */ `
varying vec3 v_col;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.05, r);
  gl_FragColor = vec4(v_col, a * 0.92);
}`;

// Event horizon rim glow
const EH_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir   = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}`;

const EH_FRAG = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
uniform float u_time;

void main() {
  float rim   = 1.0 - max(dot(vNormal, vViewDir), 0.0);
  rim         = pow(rim, 2.2);
  float pulse = 0.82 + 0.18 * sin(u_time * 0.9);
  vec3 col    = mix(vec3(1.0, 0.38, 0.04), vec3(1.0, 0.78, 0.28), rim * rim);
  gl_FragColor = vec4(col, rim * 0.7 * pulse);
}`;

// ─── Accretion Disk ───────────────────────────────────────────────────────────

function AccretionDisk({ innerR = 1.9, outerR = 6.6, count = 5500 }: {
  innerR?: number; outerR?: number; count?: number;
}) {
  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(hashSeed("accretion-v3"));
    const r      = new Float32Array(count);
    const theta0 = new Float32Array(count);
    const omega  = new Float32Array(count);
    const sz     = new Float32Array(count);
    const bright = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Bias density toward inner edge (hotter, denser region)
      const ri = innerR + Math.pow(rng(), 0.6) * (outerR - innerR);
      r[i]      = ri;
      theta0[i] = rng() * Math.PI * 2;
      // Keplerian angular velocity ∝ r^(-3/2)
      omega[i]  = (0.38 / Math.pow(ri, 1.5)) * (0.9 + rng() * 0.2);
      sz[i]     = Math.max(0.4, 1.2 + rng() * 2.8 - (ri / outerR) * 1.2);
      bright[i] = 0.45 + rng() * 0.55;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("a_r",      new THREE.BufferAttribute(r,      1));
    g.setAttribute("a_theta0", new THREE.BufferAttribute(theta0, 1));
    g.setAttribute("a_omega",  new THREE.BufferAttribute(omega,  1));
    g.setAttribute("a_sz",     new THREE.BufferAttribute(sz,     1));
    g.setAttribute("a_bright", new THREE.BufferAttribute(bright, 1));
    // Dummy position buffer — actual positions computed in vertex shader
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const m = new THREE.ShaderMaterial({
      vertexShader:   DISK_VERT,
      fragmentShader: DISK_FRAG,
      uniforms: { u_t: { value: 0 } },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    return { geometry: g, material: m };
  }, [innerR, outerR, count]);

  useFrame(({ clock }) => {
    material.uniforms.u_t.value = clock.getElapsedTime();
  });

  // Tilted ~23° so we see disk as an asymmetric ellipse — the classic Interstellar look
  return (
    <points geometry={geometry} material={material}
      rotation={[0.40, 0.18, 0.06]}
      frustumCulled={false}
    />
  );
}

// ─── Polar Jets ───────────────────────────────────────────────────────────────

function mkJetGeo(side: 1 | -1, count: number, rng: () => number) {
  const t_arr = new Float32Array(count);
  const phi   = new Float32Array(count);
  const spd   = new Float32Array(count);
  const s_arr = new Float32Array(count);
  const br    = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    t_arr[i] = rng();
    phi[i]   = rng() * Math.PI * 2;
    spd[i]   = 0.55 + rng() * 0.9;
    s_arr[i] = side;
    br[i]    = 0.35 + rng() * 0.65;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("a_t",      new THREE.BufferAttribute(t_arr, 1));
  g.setAttribute("a_phi",    new THREE.BufferAttribute(phi,   1));
  g.setAttribute("a_spd",    new THREE.BufferAttribute(spd,   1));
  g.setAttribute("a_side",   new THREE.BufferAttribute(s_arr, 1));
  g.setAttribute("a_bright", new THREE.BufferAttribute(br,    1));
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  return g;
}

function PolarJets({ count = 700 }: { count?: number }) {
  const { topGeo, botGeo, material } = useMemo(() => {
    const rng = mulberry32(hashSeed("polar-jets-v2"));
    const m = new THREE.ShaderMaterial({
      vertexShader:   JET_VERT,
      fragmentShader: JET_FRAG,
      uniforms: { u_time: { value: 0 } },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });
    return { topGeo: mkJetGeo(1, count, rng), botGeo: mkJetGeo(-1, count, rng), material: m };
  }, [count]);

  useFrame(({ clock }) => { material.uniforms.u_time.value = clock.getElapsedTime(); });

  return (
    <>
      <points geometry={topGeo} material={material} frustumCulled={false} />
      <points geometry={botGeo} material={material} frustumCulled={false} />
    </>
  );
}

// ─── Cosmic Nebulae ───────────────────────────────────────────────────────────

const NEBULA_DEFS = [
  { cx: -16, cy:  5, cz: -38, color: [0.60, 0.12, 0.92] as [number,number,number], spread: 13 },
  { cx:  20, cy: -4, cz: -44, color: [0.06, 0.48, 0.95] as [number,number,number], spread: 15 },
  { cx:   2, cy: 14, cz: -52, color: [0.92, 0.16, 0.58] as [number,number,number], spread: 11 },
  { cx: -28, cy: -8, cz: -60, color: [0.14, 0.72, 0.88] as [number,number,number], spread:  9 },
];

function CosmicNebulae({ perCloud = 280 }: { perCloud?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const clouds = useMemo(() => {
    return NEBULA_DEFS.map((def, ci) => {
      const rng = mulberry32(hashSeed(`nebula-${ci}-v2`));
      const n = perCloud;
      const pos   = new Float32Array(n * 3);
      const col   = new Float32Array(n * 3);
      const sz    = new Float32Array(n);
      const alpha = new Float32Array(n);

      for (let i = 0; i < n; i++) {
        // Ellipsoidal distribution (flattened in Y)
        const phi   = Math.acos(2 * rng() - 1);
        const theta = rng() * Math.PI * 2;
        const r     = Math.pow(rng(), 0.35) * def.spread;
        pos[i*3+0] = def.cx + r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = def.cy + r * Math.sin(phi) * Math.sin(theta) * 0.45;
        pos[i*3+2] = def.cz + r * Math.cos(phi) * 0.55;

        const br    = 0.5 + rng() * 0.5;
        col[i*3+0] = def.color[0] * br;
        col[i*3+1] = def.color[1] * br;
        col[i*3+2] = def.color[2] * br;

        sz[i]    = 4.0 + rng() * 8.0;
        alpha[i] = 0.25 + rng() * 0.75;
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos,   3));
      g.setAttribute("a_col",    new THREE.BufferAttribute(col,   3));
      g.setAttribute("a_sz",     new THREE.BufferAttribute(sz,    1));
      g.setAttribute("a_alpha",  new THREE.BufferAttribute(alpha, 1));

      const m = new THREE.ShaderMaterial({
        vertexShader:   NEBULA_VERT,
        fragmentShader: NEBULA_FRAG,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      });

      return { g, m, key: ci };
    });
  }, [perCloud]);

  // Very slow ambient drift
  useFrame(({ clock }) => {
    const grp = groupRef.current;
    if (!grp) return;
    const t = clock.getElapsedTime() * 0.006;
    grp.rotation.y = t;
    grp.rotation.x = Math.sin(t * 0.7) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {clouds.map(({ g, m, key }) => (
        <points key={key} geometry={g} material={m} frustumCulled={false} />
      ))}
    </group>
  );
}

// ─── Enhanced Star Tunnel (with color & size variation) ───────────────────────

const STAR_COLORS_POOL: [number, number, number][] = [
  [1.00, 1.00, 1.00], [1.00, 1.00, 1.00], [1.00, 1.00, 1.00], // 45% pure white
  [0.75, 0.88, 1.00], [0.75, 0.88, 1.00],                      // 25% blue-white
  [1.00, 0.95, 0.72], [1.00, 0.95, 0.72],                      // 20% yellow
  [1.00, 0.70, 0.50],                                           //  7% orange giant
  [0.88, 0.60, 1.00],                                           //  3% purple giant
];

function EnhancedStarTunnel({
  progress,
  count = 2400,
  radius = 13,
  depth = 200,
  seed = 1337,
}: {
  progress: number; count?: number; radius?: number; depth?: number; seed?: number;
}) {
  const smooth = useRef(0);
  const prev   = useRef(0);

  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz  = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const t = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius;
      pos[i*3+0] = Math.cos(t) * r;
      pos[i*3+1] = Math.sin(t) * r;
      pos[i*3+2] = -rng() * depth;

      const c = STAR_COLORS_POOL[Math.floor(rng() * STAR_COLORS_POOL.length)];
      col[i*3+0] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2];

      // Most stars are small; 3% are "bright beacon" stars
      sz[i] = rng() > 0.97 ? 3.5 + rng() * 2.0 : 0.5 + rng() * 1.5;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("a_col",    new THREE.BufferAttribute(col, 3));
    g.setAttribute("a_sz",     new THREE.BufferAttribute(sz,  1));

    const m = new THREE.ShaderMaterial({
      vertexShader:   STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    return { geometry: g, material: m };
  }, [count, radius, depth, seed]);

  useFrame((_, dt) => {
    const SMOOTH = 1 - Math.pow(0.0008, dt);
    smooth.current = THREE.MathUtils.lerp(smooth.current, progress, SMOOTH);

    const cur = smooth.current;
    const dp  = cur - prev.current;
    prev.current = cur;

    const impulse = THREE.MathUtils.clamp(Math.abs(dp) * 900, 0, 22);
    const speed   = (6.0 + impulse) * Math.sign(dp || 1);

    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const a = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3 + 2;
      a[idx] += speed * dt;
      if (a[idx] > 1)      a[idx] = -depth;
      if (a[idx] < -depth) a[idx] = 1;
    }
    attr.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

// ─── Event Horizon Glow (rim-lit photon ring) ─────────────────────────────────

function EventHorizonGlow({ radius = 2.5 }: { radius?: number }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   EH_VERT,
    fragmentShader: EH_FRAG,
    uniforms: { u_time: { value: 0 } },
    transparent: true,
    depthWrite:  false,
    side:        THREE.FrontSide,
    blending:    THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => { material.uniforms.u_time.value = clock.getElapsedTime(); });

  return (
    <mesh material={material} scale={radius} renderOrder={-1}>
      <sphereGeometry args={[1, 40, 40]} />
    </mesh>
  );
}

// ─── Black Hole Model ─────────────────────────────────────────────────────────

function BlackHoleModel({ url }: { url: string }) {
  const spin = useRef<THREE.Group>(null);
  const gltf = useGLTF(url) as any;

  const { scene, scale, offset } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box   = new THREE.Box3().setFromObject(scene);
    const size  = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const scale   = 4.2 / maxAxis;
    const offset: [number, number, number] = [-center.x, -center.y, -center.z];
    scene.traverse((obj: any) => {
      if (obj.isMesh) { obj.castShadow = false; obj.receiveShadow = false; }
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

// ─── Camera Rig ───────────────────────────────────────────────────────────────

function ScrollRig({ progress }: { progress: number }) {
  const smooth = useRef(0);

  useFrame(({ camera }, dt) => {
    const SMOOTH = 1 - Math.pow(0.0008, dt);
    smooth.current = THREE.MathUtils.lerp(smooth.current, progress, SMOOTH);
    const p = smooth.current;
    const eased = p * p * (3 - 2 * p);
    camera.position.set(
      0.15 * (1 - eased),
      0.05 * (1 - eased),
      THREE.MathUtils.lerp(9.5, 3.2, eased)
    );
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(42, 28, eased);
    }
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function isLowEnd() {
  if (typeof navigator === "undefined") return false;
  const mem   = (navigator as any).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  return mem <= 4 || cores <= 4;
}

// ─── Scene root ───────────────────────────────────────────────────────────────

export default function BlackHoleScene({
  progress,
  enabled,
  modelUrl = "/models/blackhole.glb",
  interactive = true,
}: BlackHoleSceneProps) {
  if (!enabled) return null;

  const lowEnd  = isLowEnd();
  const starSeed = useMemo(() => hashSeed("blackhole-starfield-v2"), []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        frameloop="always"
        dpr={[1, lowEnd ? 1 : 1.5]}
        gl={{
          antialias:        false,
          alpha:            true,
          powerPreference:  "high-performance",
          toneMapping:      THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        camera={{ position: [0.15, 0.05, 9.5], fov: 42, near: 0.1, far: 300 }}
      >
        <color attach="background" args={["#000005"]} />

        {/* Very subtle deep-space fog */}
        <fogExp2 attach="fog" args={["#010008", 0.004]} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[6, 6, 6]} intensity={0.7} />

        <Suspense fallback={null}>
          {!lowEnd ? <Environment preset="night" /> : null}

          {/* Star tunnel — outermost layer */}
          <EnhancedStarTunnel progress={progress} count={2400} seed={starSeed} />

          {/* Volumetric nebulae in the background */}
          {!lowEnd ? <CosmicNebulae perCloud={280} /> : null}

          {/* Accretion disk orbiting the black hole */}
          <AccretionDisk
            innerR={1.9}
            outerR={6.6}
            count={lowEnd ? 2000 : 5500}
          />

          {/* Polar relativistic jets */}
          {!lowEnd ? <PolarJets count={700} /> : null}

          {/* Event horizon photon-ring rim glow */}
          <EventHorizonGlow radius={2.55} />

          {/* The black hole model itself */}
          <BlackHoleModel url={modelUrl} />

          <ScrollRig progress={progress} />

          {!lowEnd ? (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={1.4}
                luminanceThreshold={0.08}
                luminanceSmoothing={0.5}
                mipmapBlur
              />
            </EffectComposer>
          ) : (
            <EffectComposer multisampling={0}>
              <Bloom intensity={0.6} luminanceThreshold={0.3} luminanceSmoothing={0.2} />
            </EffectComposer>
          )}

          {interactive ? (
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.35}
              zoomSpeed={0.6}
              minDistance={3.0}
              maxDistance={18.0}
              target={[0, 0, 0]}
            />
          ) : null}

          <Preload />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/blackhole.glb");
