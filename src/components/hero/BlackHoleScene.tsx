/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Billboard, Environment, OrbitControls, Preload, Text, useGLTF,
} from "@react-three/drei";
import {
  Bloom, ChromaticAberration, EffectComposer, Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import React, { Suspense, useEffect, useMemo, useRef } from "react";

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

const DISK_VERT = /* glsl */ `
attribute float a_r;
attribute float a_theta0;
attribute float a_omega;
attribute float a_sz;
attribute float a_bright;
uniform float u_t;
uniform vec3 u_cursor;
uniform float u_cursorR;
varying vec3 v_col;
varying float v_a;

void main() {
  float theta = a_theta0 + a_omega * u_t;
  float warp = sin(theta * 3.0 + a_r * 1.8) * 0.05 * max(0.0, 1.0 - (a_r - 1.5) / 5.5);
  vec3 pos = vec3(a_r * cos(theta), warp, a_r * sin(theta));

  // Push into world space so the cursor (world-space vec3) repels in the
  // right frame even though the disk is tilted.
  vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

  if (u_cursorR > 0.0) {
    vec3 toCursor = worldPos - u_cursor;
    float dist = length(toCursor);
    if (dist < u_cursorR && dist > 0.001) {
      float strength = 1.0 - dist / u_cursorR;
      strength *= strength;             // sharper falloff
      worldPos += normalize(toCursor) * strength * 0.95;
    }
  }

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

  // We already moved into world space above; skip modelView and use view.
  vec4 mvPos = viewMatrix * vec4(worldPos, 1.0);
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
uniform float u_intensity;

void main() {
  float rim   = 1.0 - max(dot(vNormal, vViewDir), 0.0);
  rim         = pow(rim, 2.2);
  float pulse = 0.82 + 0.18 * sin(u_time * 0.9);
  vec3 col    = mix(vec3(1.0, 0.38, 0.04), vec3(1.0, 0.78, 0.28), rim * rim);
  gl_FragColor = vec4(col, rim * 0.7 * pulse * u_intensity);
}`;

// ─── Photon-ring shader (around the event horizon) ────────────────────────────
//
// Approximates Doppler-beamed light bending around the BH. Combined with the
// AccretionDisk and a small lensing torus, this stack reads as a "real"
// gravitational-lens visual without doing a true GPU ray-march.

const PHOTON_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW  = normalize(mat3(modelMatrix) * normal);
  vViewDir  = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PHOTON_FRAG = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vWorldPos;
uniform float u_time;
uniform float u_intensity;

void main() {
  float rim = 1.0 - max(dot(vNormalW, vViewDir), 0.0);
  rim = pow(rim, 1.6);

  // Doppler beam: the side rotating toward camera is brighter & bluer.
  float ang = atan(vWorldPos.y, vWorldPos.x);
  float beam = 0.5 + 0.5 * cos(ang - u_time * 0.35);

  vec3 hot  = vec3(1.0, 0.92, 0.78);
  vec3 cool = vec3(0.55, 0.78, 1.0);
  vec3 warm = vec3(1.0, 0.42, 0.10);
  vec3 col  = mix(warm, hot, beam);
  col       = mix(col, cool, smoothstep(0.55, 0.95, rim) * beam * 0.4);

  // Concentrate brightness into a thin photon-ring band.
  float band = smoothstep(0.45, 0.78, rim);
  col *= 1.0 + band * 2.4;

  float a = rim * 0.85 * u_intensity;
  gl_FragColor = vec4(col, a);
}`;

// ─── Accretion Disk ───────────────────────────────────────────────────────────

function AccretionDisk({
  innerR = 1.9, outerR = 6.6, count = 5500, mouseWorldRef,
}: {
  innerR?: number; outerR?: number; count?: number;
  mouseWorldRef?: React.MutableRefObject<THREE.Vector3>;
}) {
  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(hashSeed("accretion-v3"));
    const r      = new Float32Array(count);
    const theta0 = new Float32Array(count);
    const omega  = new Float32Array(count);
    const sz     = new Float32Array(count);
    const bright = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const ri = innerR + Math.pow(rng(), 0.6) * (outerR - innerR);
      r[i]      = ri;
      theta0[i] = rng() * Math.PI * 2;
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
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const m = new THREE.ShaderMaterial({
      vertexShader:   DISK_VERT,
      fragmentShader: DISK_FRAG,
      uniforms: {
        u_t:       { value: 0 },
        u_cursor:  { value: new THREE.Vector3(999, 999, 999) },
        u_cursorR: { value: mouseWorldRef ? 2.4 : 0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    return { geometry: g, material: m };
  }, [innerR, outerR, count, mouseWorldRef]);

  useFrame(({ clock }) => {
    material.uniforms.u_t.value = clock.getElapsedTime();
    if (mouseWorldRef) {
      material.uniforms.u_cursor.value.copy(mouseWorldRef.current);
    }
  });

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

// ─── Star Tunnel ──────────────────────────────────────────────────────────────

const STAR_COLORS_POOL: [number, number, number][] = [
  [1.00, 1.00, 1.00], [1.00, 1.00, 1.00], [1.00, 1.00, 1.00],
  [0.75, 0.88, 1.00], [0.75, 0.88, 1.00],
  [1.00, 0.95, 0.72], [1.00, 0.95, 0.72],
  [1.00, 0.70, 0.50],
  [0.88, 0.60, 1.00],
];

function EnhancedStarTunnel({
  progressRef,
  count = 2400,
  radius = 13,
  depth = 200,
  seed = 1337,
}: {
  progressRef: React.MutableRefObject<number>;
  count?: number; radius?: number; depth?: number; seed?: number;
}) {
  const prev = useRef(0);

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
    const cur = progressRef.current;
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

// ─── Event Horizon Glow ───────────────────────────────────────────────────────

function EventHorizonGlow({
  radius = 2.5, progressRef,
}: { radius?: number; progressRef: React.MutableRefObject<number> }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   EH_VERT,
    fragmentShader: EH_FRAG,
    uniforms: { u_time: { value: 0 }, u_intensity: { value: 1 } },
    transparent: true,
    depthWrite:  false,
    side:        THREE.FrontSide,
    blending:    THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    material.uniforms.u_time.value = clock.getElapsedTime();
    // Rim glow brightens as we descend — feels like approaching the singularity
    material.uniforms.u_intensity.value = 1.0 + progressRef.current * 1.8;
  });

  return (
    <mesh material={material} scale={radius} renderOrder={-1}>
      <sphereGeometry args={[1, 40, 40]} />
    </mesh>
  );
}

// ─── Procedural Black Hole — replaces the GLB with shader-driven layers ─────
//
// Three meshes stacked: an absolute-black event horizon sphere, a thin
// photon-ring sphere with Doppler-beamed shader, and a tilted lensing torus
// that suggests bent light wrapping around the horizon.

function RayMarchedBlackHole({
  radius = 1.7,
  progressRef,
}: {
  radius?: number;
  progressRef: React.MutableRefObject<number>;
}) {
  const spin = useRef<THREE.Group>(null);

  const eventHorizonMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.FrontSide,
    depthWrite: true,
  }), []);

  const photonMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   PHOTON_VERT,
    fragmentShader: PHOTON_FRAG,
    uniforms: {
      u_time:      { value: 0 },
      u_intensity: { value: 1.0 },
    },
    transparent: true,
    depthWrite:  false,
    side:        THREE.FrontSide,
    blending:    THREE.AdditiveBlending,
  }), []);

  const lensingMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffba66,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((_, dt) => {
    photonMat.uniforms.u_time.value += dt;
    // Photon ring brightens as we descend toward the singularity.
    photonMat.uniforms.u_intensity.value = 1.0 + progressRef.current * 1.4;
    if (spin.current) {
      spin.current.rotation.y += dt * 0.18;
      spin.current.rotation.z += dt * 0.05;
    }
  });

  return (
    <group ref={spin}>
      {/* Event horizon — pure black core */}
      <mesh material={eventHorizonMat} renderOrder={-2}>
        <sphereGeometry args={[radius, 48, 48]} />
      </mesh>

      {/* Photon ring — additive outer shell */}
      <mesh material={photonMat} renderOrder={-1}>
        <sphereGeometry args={[radius * 1.18, 64, 64]} />
      </mesh>

      {/* Lensing photon orbit — thin tilted torus */}
      <mesh rotation={[Math.PI / 2.4, 0.1, 0]} material={lensingMat}>
        <torusGeometry args={[radius * 1.55, 0.025, 16, 128]} />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, -0.15, 0.2]} material={lensingMat}>
        <torusGeometry args={[radius * 1.72, 0.015, 16, 128]} />
      </mesh>
    </group>
  );
}

// ─── Black Hole Model (legacy GLB loader — kept for fallback) ────────────────

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

// ─── Photon Sphere — orbiting tech labels (the user's "skills ring") ──────────

const TECH_LABELS = [
  "React",      "TypeScript", "Next.js",     "Three.js",   "GLSL",
  "Python",     "Go",         "Rust",        "Swift",      "Node.js",
  "AWS",        "Kubernetes", "Docker",      "FastAPI",    "GraphQL",
  "Postgres",   "Redis",      "Tailwind",    "Quantum ML", "WebGL",
];

function PhotonSphere({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const placements = useMemo(() => {
    const rng = mulberry32(hashSeed("photon-labels-v1"));
    return TECH_LABELS.map((label, i) => {
      const angle = (i / TECH_LABELS.length) * Math.PI * 2;
      const r = 7.2 + (rng() - 0.5) * 0.9;
      const y = (rng() - 0.5) * 3.2;
      // Each label gets a unique colour drawn from a violet-blue-pink palette
      const palette = ["#c4b5fd", "#a78bfa", "#818cf8", "#f0abfc", "#67e8f9", "#fbbf24"];
      const color = palette[i % palette.length];
      return { label, angle, r, y, color, scale: 0.85 + rng() * 0.5 };
    });
  }, []);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y += dt * 0.045;        // slow orbit

    // Labels appear during mid-scroll (when the user is reading Experience/About).
    const p = progressRef.current;
    const visible =
      p < 0.10 ? 0 :
      p < 0.22 ? (p - 0.10) / 0.12 :
      p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.12) :
      1;

    g.traverse((obj: any) => {
      const m = obj.material;
      if (m && "opacity" in m) m.opacity = visible * 0.92;
    });
  });

  return (
    <group ref={groupRef}>
      {placements.map(({ label, angle, r, y, color, scale }) => (
        <Billboard
          key={label}
          position={[Math.cos(angle) * r, y, Math.sin(angle) * r]}
        >
          <Text
            fontSize={0.32 * scale}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#0a0420"
            material-transparent
            material-depthWrite={false}
            material-toneMapped={false}
          >
            {label}
          </Text>
        </Billboard>
      ))}
    </group>
  );
}

// ─── Interactive Photon Sphere — labels physically react to the cursor ───────
//
// Each label has its own orbital target and a current position that lerps
// toward target + a repulsion vector when the cursor's world-space point
// gets close. Looks like the cursor is parting a cloud of debris.

function InteractivePhotonSphere({
  progressRef, mouseWorldRef,
}: {
  progressRef: React.MutableRefObject<number>;
  mouseWorldRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const placements = useMemo(() => {
    const rng = mulberry32(hashSeed("photon-labels-v2-interactive"));
    return TECH_LABELS.map((label, i) => {
      const angle0 = (i / TECH_LABELS.length) * Math.PI * 2;
      const r = 7.2 + (rng() - 0.5) * 0.9;
      const y = (rng() - 0.5) * 3.2;
      const palette = ["#c4b5fd", "#a78bfa", "#818cf8", "#f0abfc", "#67e8f9", "#fbbf24"];
      const color = palette[i % palette.length];
      const scale = 0.85 + rng() * 0.5;
      return {
        label, angle0, r, y, color, scale,
        // Live body — mutated in useFrame and copied to the billboard each frame.
        current: new THREE.Vector3(Math.cos(angle0) * r, y, Math.sin(angle0) * r),
      };
    });
  }, []);

  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const pushVec   = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const orbitAng = t * 0.045;            // slow global orbit
    const cursor   = mouseWorldRef.current;

    // Visibility across scroll story (same gating as static PhotonSphere).
    const p = progressRef.current;
    const visible =
      p < 0.10 ? 0 :
      p < 0.22 ? (p - 0.10) / 0.12 :
      p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.12) :
      1;
    const alpha = visible * 0.92;

    const PUSH_R = 2.6;

    g.children.forEach((child, i) => {
      const b = placements[i];
      if (!b) return;

      // Target orbital position (rotates around BH)
      const a = b.angle0 + orbitAng;
      targetVec.set(Math.cos(a) * b.r, b.y, Math.sin(a) * b.r);

      // Cursor repulsion in world space.
      pushVec.subVectors(targetVec, cursor);
      const d = pushVec.length();
      if (d < PUSH_R && d > 0.001) {
        const strength = 1 - d / PUSH_R;
        // Quadratic falloff + bigger push the closer the cursor gets.
        pushVec.normalize().multiplyScalar(strength * strength * 2.4);
        targetVec.add(pushVec);
      }

      // Lerp current → target so labels feel weighty, not snappy.
      const k = 1 - Math.pow(0.0007, dt);
      b.current.lerp(targetVec, k);
      child.position.copy(b.current);

      // Visibility — set on whatever Text material this Billboard holds.
      child.traverse((obj: any) => {
        const m = obj.material;
        if (m && "opacity" in m) m.opacity = alpha;
      });
    });
  });

  return (
    <group ref={groupRef}>
      {placements.map(({ label, color, scale, current }) => (
        <Billboard key={label} position={[current.x, current.y, current.z]}>
          <Text
            fontSize={0.32 * scale}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#0a0420"
            material-transparent
            material-depthWrite={false}
            material-toneMapped={false}
          >
            {label}
          </Text>
        </Billboard>
      ))}
    </group>
  );
}

// ─── Mouse → 3D world projector ──────────────────────────────────────────────
//
// Projects the normalized-device-coord mouse onto a plane in world space
// (perpendicular to the camera's forward axis, at a configurable depth) so
// the rest of the scene can treat the cursor as a real 3D point.

function MouseProjector({
  mouseScreenRef, mouseWorldRef, mouseVelRef, planeDepth = 2.0,
}: {
  mouseScreenRef: React.MutableRefObject<{ x: number; y: number }>;
  mouseWorldRef:  React.MutableRefObject<THREE.Vector3>;
  mouseVelRef:    React.MutableRefObject<number>;
  planeDepth?: number;
}) {
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane     = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeDepth), [planeDepth]);
  const ndc       = useMemo(() => new THREE.Vector2(), []);
  const target    = useMemo(() => new THREE.Vector3(), []);
  const prev      = useMemo(() => new THREE.Vector3(99, 99, 99), []);

  useFrame((_, dt) => {
    ndc.set(
      mouseScreenRef.current.x * 2 - 1,
      -(mouseScreenRef.current.y * 2 - 1),
    );
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, target)) {
      const speed = target.distanceTo(prev) / Math.max(dt, 0.001);
      mouseVelRef.current = mouseVelRef.current * 0.82 + speed * 0.18;
      prev.copy(target);
      // Smooth follow so disk/labels don't jitter on every pixel of mouse move.
      mouseWorldRef.current.lerp(target, 0.28);
    }
  });

  return null;
}

// ─── Cursor Orb — visible 3D indicator that pulses with mouse velocity ───────

function CursorOrb({
  mouseWorldRef, mouseVelRef, mouseDownRef,
}: {
  mouseWorldRef: React.MutableRefObject<THREE.Vector3>;
  mouseVelRef:   React.MutableRefObject<number>;
  mouseDownRef:  React.MutableRefObject<boolean>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xc4b5fd, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xa78bfa, transparent: true, opacity: 0.30,
    depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), []);

  useFrame((_, dt) => {
    if (!meshRef.current || !ringRef.current) return;
    const p = mouseWorldRef.current;
    meshRef.current.position.copy(p);
    ringRef.current.position.copy(p);

    const velBoost = Math.min(2.5, mouseVelRef.current * 0.45);
    const downBoost = mouseDownRef.current ? 1.0 : 0;
    const scale = 0.20 + velBoost * 0.12 + downBoost * 0.25;
    meshRef.current.scale.setScalar(scale);

    // Ring pulses outward continuously, faster when moving.
    const t = performance.now() * 0.001;
    const ringScale = 0.35 + (Math.sin(t * 2.0 + velBoost * 3) * 0.5 + 0.5) * (0.6 + velBoost * 0.4);
    ringRef.current.scale.setScalar(ringScale);
    coreMat.opacity = 0.4 + velBoost * 0.18 + downBoost * 0.3;
    ringMat.opacity = Math.max(0, 0.32 - (ringScale - 0.35) * 0.35);

    // Always face camera
    if (ringRef.current) {
      ringRef.current.lookAt(0, 0, 1e6);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} material={coreMat}>
        <sphereGeometry args={[1, 12, 12]} />
      </mesh>
      <mesh ref={ringRef} material={ringMat}>
        <ringGeometry args={[0.78, 1.0, 32]} />
      </mesh>
    </group>
  );
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────
//
// Multi-phase Bezier-ish path that descends toward the singularity as the
// user scrolls. The camera also gently orbits (sin/cos in x/z) so the disk
// presents a different angle at each phase — gives the story visual variety.

function ScrollRig({
  progress, progressRef, mouseScreenRef, clickShakeRef, mouseVelRef,
}: {
  progress: number;
  progressRef: React.MutableRefObject<number>;
  mouseScreenRef?: React.MutableRefObject<{ x: number; y: number }>;
  clickShakeRef?:  React.MutableRefObject<number>;
  mouseVelRef?:    React.MutableRefObject<number>;
}) {
  const smooth = useRef(0);
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(({ camera, clock }, dt) => {
    const SMOOTH = 1 - Math.pow(0.0004, dt);
    smooth.current = THREE.MathUtils.lerp(smooth.current, progress, SMOOTH);
    progressRef.current = smooth.current;

    const p = smooth.current;
    const eased = p * p * (3 - 2 * p);

    const z = THREE.MathUtils.lerp(11.0, 1.85, eased);
    const orbitAng = eased * Math.PI * 1.15;
    const orbitR = THREE.MathUtils.lerp(0.4, 1.6, eased);
    let x = Math.sin(orbitAng) * orbitR;
    let y = 0.55 - eased * 1.65 + Math.sin(eased * Math.PI) * 0.45;

    // Mouse-driven head-turn — slight parallax that makes you feel embodied.
    if (mouseScreenRef) {
      const mx = (mouseScreenRef.current.x - 0.5) * 0.65;
      const my = (mouseScreenRef.current.y - 0.5) * 0.40;
      x += mx;
      y -= my;
    }

    // Velocity heaviness — fast mouse swings nudge the camera in the same axis.
    if (mouseVelRef && mouseVelRef.current > 0.05) {
      const wob = Math.sin(clock.getElapsedTime() * 9.0) * Math.min(0.05, mouseVelRef.current * 0.008);
      x += wob;
    }

    // Click shake — quick exponential decay
    if (clickShakeRef && clickShakeRef.current > 0.01) {
      const s = clickShakeRef.current;
      x += (Math.random() - 0.5) * s * 0.20;
      y += (Math.random() - 0.5) * s * 0.20;
      clickShakeRef.current = s * 0.84;
    }

    camera.position.set(x, y, z);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(48, 22, eased);
    }
    camera.updateProjectionMatrix();
    camera.lookAt(target);
  });

  return null;
}

// ─── Post-processing ──────────────────────────────────────────────────────────
//
// Bloom + Chromatic Aberration + Vignette use static values. We avoid React
// refs on the effect instances because @react-three/postprocessing exposes
// internal classes (KawaseBlurPass / Resolution) that hold circular references,
// which break Next 16/React 19's dev-mode serialization when refs are tracked.
//
// The cinematic intensity ramp now lives entirely in the camera path + the
// EventHorizonGlow uniform (which is shader-side and safe).

function isLowEnd() {
  if (typeof navigator === "undefined") return false;
  const mem   = (navigator as any).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  // Treat mobile / narrow viewports as low-end too — keeps the scene smooth
  // on phones by trimming particle counts, skipping the HDRI, and lowering DPR.
  const mobile = typeof window !== "undefined" && (
    window.innerWidth < 768 ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
  return mobile || mem <= 4 || cores <= 4;
}

// ─── Scene root ───────────────────────────────────────────────────────────────

export default function BlackHoleScene({
  progress,
  enabled,
  modelUrl = "/models/blackhole.glb",
  interactive = false,
}: BlackHoleSceneProps) {
  // All hooks must run on every render — never return before this block, or
  // hook counts diverge between renders and React throws
  // "Expected static flag was missing".
  const lowEnd  = isLowEnd();
  const starSeed = useMemo(() => hashSeed("blackhole-starfield-v2"), []);

  // Shared smoothed-progress ref — written by ScrollRig, read by other systems.
  const progressRef = useRef(0);

  // Mouse interaction refs — read/written across the scene graph.
  //   • mouseScreenRef → normalized (0-1) viewport coords from window events
  //   • mouseWorldRef  → projected 3D world position (set by MouseProjector)
  //   • mouseVelRef    → smoothed scalar speed of the world-projected point
  //   • mouseDownRef   → primary button held
  //   • clickShakeRef  → impulse value (0-1) that decays each frame
  const mouseScreenRef = useRef({ x: 0.5, y: 0.5 });
  const mouseWorldRef  = useRef(new THREE.Vector3(8, 4, 4));
  const mouseVelRef    = useRef(0);
  const mouseDownRef   = useRef(false);
  const clickShakeRef  = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseScreenRef.current.x = e.clientX / window.innerWidth;
      mouseScreenRef.current.y = e.clientY / window.innerHeight;
    };
    const onDown = () => {
      mouseDownRef.current = true;
      clickShakeRef.current = 1;
    };
    const onUp = () => { mouseDownRef.current = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup",   onUp,   { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup",   onUp);
    };
  }, []);

  if (!enabled) return null;

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
        camera={{ position: [0.4, 0.55, 11.0], fov: 48, near: 0.1, far: 300 }}
      >
        <color attach="background" args={["#000005"]} />
        <fogExp2 attach="fog" args={["#010008", 0.004]} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[6, 6, 6]} intensity={0.7} />

        <Suspense fallback={null}>
          {!lowEnd ? <Environment preset="night" /> : null}

          <EnhancedStarTunnel progressRef={progressRef} count={lowEnd ? 1400 : 2400} seed={starSeed} />

          {!lowEnd ? <CosmicNebulae perCloud={280} /> : null}

          <AccretionDisk
            innerR={1.9}
            outerR={6.6}
            count={lowEnd ? 2000 : 5500}
            mouseWorldRef={mouseWorldRef}
          />

          {!lowEnd ? <PolarJets count={700} /> : null}

          <EventHorizonGlow radius={2.55} progressRef={progressRef} />

          {!lowEnd ? (
            <InteractivePhotonSphere
              progressRef={progressRef}
              mouseWorldRef={mouseWorldRef}
            />
          ) : null}

          <RayMarchedBlackHole radius={1.75} progressRef={progressRef} />

          <MouseProjector
            mouseScreenRef={mouseScreenRef}
            mouseWorldRef={mouseWorldRef}
            mouseVelRef={mouseVelRef}
            planeDepth={2.0}
          />

          {!lowEnd ? (
            <CursorOrb
              mouseWorldRef={mouseWorldRef}
              mouseVelRef={mouseVelRef}
              mouseDownRef={mouseDownRef}
            />
          ) : null}

          <ScrollRig
            progress={progress}
            progressRef={progressRef}
            mouseScreenRef={mouseScreenRef}
            mouseVelRef={mouseVelRef}
            clickShakeRef={clickShakeRef}
          />

          {!lowEnd ? (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={1.8}
                luminanceThreshold={0.10}
                luminanceSmoothing={0.5}
              />
              <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={[0.0018, 0.0018]}
                radialModulation={false}
                modulationOffset={0}
              />
              <Vignette
                eskil={false}
                offset={0.18}
                darkness={0.52}
              />
            </EffectComposer>
          ) : (
            <EffectComposer multisampling={0}>
              <Bloom intensity={0.85} luminanceThreshold={0.3} luminanceSmoothing={0.2} />
              <Vignette eskil={false} offset={0.2} darkness={0.45} />
            </EffectComposer>
          )}

          {interactive ? (
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.35}
              zoomSpeed={0.6}
              minDistance={1.8}
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
