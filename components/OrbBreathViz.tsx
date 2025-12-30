
import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BreathPhase, ColorTheme, QualityTier } from "../types";

type Props = {
  phase: BreathPhase;
  theme: ColorTheme;
  quality: QualityTier;
  reduceMotion: boolean;
  isActive: boolean;
  progressRef: React.MutableRefObject<number>;
};

// ----- Palette: "Sắc Pháp" (The Colors of Dharma) -----
// Deep, rich, layered colors designed for OLED screens and deep immersion.
const THEMES = {
  warm: {
    // "Tâm Từ" (Metta) - Loving Kindness: Golden Amber, Deep Saffron, Warm Skin
    bgHigh: new THREE.Color("#1a0f00"), 
    bgLow: new THREE.Color("#000000"),
    core: new THREE.Color("#ffbe76"),
    shell: new THREE.Color("#d35400"), 
    accent: new THREE.Color("#ffeaa7"),
    smoke: new THREE.Color("#e17055")
  },
  cool: {
    // "Tâm Xả" (Upekkha) - Equanimity: Deep Ocean, Jade, Moon
    bgHigh: new THREE.Color("#001219"),
    bgLow: new THREE.Color("#000000"),
    core: new THREE.Color("#81ecec"),
    shell: new THREE.Color("#0984e3"),
    accent: new THREE.Color("#74b9ff"),
    smoke: new THREE.Color("#00cec9")
  },
  neutral: {
    // "Chân Như" (Tathata) - Suchness: Silver, Void, Incense Smoke
    bgHigh: new THREE.Color("#121216"),
    bgLow: new THREE.Color("#000000"),
    core: new THREE.Color("#dfe6e9"),
    shell: new THREE.Color("#636e72"),
    accent: new THREE.Color("#ffffff"),
    smoke: new THREE.Color("#b2bec3")
  },
} as const;

// ----- Quality Config -----
function resolveTier(q: QualityTier) {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const isLow = q === "low";
  // We need high segment count for the fluid displacement to look "liquid"
  return { 
    dpr: isLow ? Math.min(dpr, 1) : Math.min(dpr, 1.5), 
    geoSeg: isLow ? 64 : 128, 
    particles: isLow ? 20 : 120
  };
}

// ==========================================
// SHADER ARTISTRY: THE "ETHEREAL FLUID"
// ==========================================

// Shared Simplex Noise Function (Optimized)
const NOISE_CHUNK = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
`;

// 1. VOID SHADER (Background)
// Creates a subtle, slow-moving aurora effect in the deep background.
const VOID_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;
const VOID_FRAG = `
varying vec2 vUv;
uniform vec3 uColorHigh;
uniform vec3 uColorLow;
uniform float uTime;
uniform float uIntensity;

${NOISE_CHUNK}

void main() {
  vec2 uv = vUv;
  
  // Slow moving nebula clouds
  float n1 = snoise(vec3(uv * 1.5, uTime * 0.05));
  float n2 = snoise(vec3(uv * 3.0, uTime * 0.02 + 10.0));
  
  float cloud = (n1 + n2 * 0.5) * 0.5; // -1 to 1
  
  // Radial Vignette
  float dist = length(uv - 0.5);
  float vignette = smoothstep(0.8, 0.2, dist);
  
  // Mix Colors
  // Base background
  vec3 bg = mix(uColorLow, uColorHigh, vignette * 0.4);
  
  // Aurora glow based on breath intensity
  vec3 aurora = mix(uColorLow, uColorHigh * 1.5, smoothstep(-0.2, 0.8, cloud));
  
  // Final composite
  vec3 finalCol = mix(bg, aurora, 0.15 + (uIntensity * 0.15));
  
  // Subtle dithering
  float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
  finalCol += (noise - 0.5) * 0.015;

  gl_FragColor = vec4(finalCol, 1.0);
}
`;

// 2. FLUID ORB SHADER (The Spirit)
// Uses multi-layered displacement and Fresnel for a liquid glass look.
const FLUID_VERT = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;
varying vec3 vWorldPos;

uniform float uTime;
uniform float uExpand;     // Breath expansion
uniform float uTurbulence; // Chaos factor

${NOISE_CHUNK}

void main() {
  vec3 p = position;
  
  // Layer 1: Large structural movement (Breathing shape)
  float largeNoise = snoise(p * 0.8 + vec3(0.0, uTime * 0.2, 0.0));
  
  // Layer 2: Fine liquid detail
  float fineNoise = snoise(p * 2.5 - uTime * 0.3);
  
  // Combine noise based on turbulence
  float combinedNoise = (largeNoise * 0.6 + fineNoise * 0.4) * uTurbulence;
  vNoise = combinedNoise;

  // Expansion logic:
  // Base sphere + Noise Displacement + Breath Expansion
  vec3 newPos = p + normal * (combinedNoise + uExpand * 0.2);

  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  vWorldPos = (modelMatrix * vec4(newPos, 1.0)).xyz;
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FLUID_FRAG = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;

uniform vec3 uCoreColor;
uniform vec3 uShellColor;
uniform vec3 uAccentColor;
uniform float uOpacity;
uniform float uIntensity; // Breath State (0-1)

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Fresnel: The rim light effect (Glassy feel)
  float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
  
  // Inner Glow: Brighter where displacement is high
  float innerGlow = smoothstep(-0.2, 0.6, vNoise);
  
  // Color Mixing Strategy
  // 1. Darker base (Shell)
  // 2. Lighter peaks (Core)
  // 3. Rim highlight (Accent)
  
  vec3 col = mix(uShellColor, uCoreColor, innerGlow * (0.6 + uIntensity * 0.4));
  
  // Add pearlescent sheen based on view angle and intensity
  col = mix(col, uAccentColor, fresnel * (0.4 + uIntensity * 0.6));
  
  // Soft alpha for ethereal look
  // Edges are clearer, center is more transparent (x-ray effect)
  float alpha = uOpacity * (0.1 + fresnel * 0.9);
  
  // Boost brightness during inhale (uIntensity)
  col *= (1.0 + uIntensity * 0.5);

  gl_FragColor = vec4(col, alpha);
}
`;

// ----- Components -----

// The Living Void
function LivingVoid({ colors, isActive, phase }: { colors: typeof THEMES['neutral'], isActive: boolean, phase: BreathPhase }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const intensityRef = useRef(0);

  useFrame((state, dt) => {
    if (mat.current) {
        const target = (isActive && (phase === 'inhale' || phase === 'holdIn')) ? 1.0 : 0.0;
        intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, target, dt * 0.5); // Very slow reaction for background

        mat.current.uniforms.uTime.value = state.clock.elapsedTime;
        mat.current.uniforms.uColorHigh.value.lerp(colors.bgHigh, 0.05);
        mat.current.uniforms.uColorLow.value.lerp(colors.bgLow, 0.05);
        mat.current.uniforms.uIntensity.value = intensityRef.current;
    }
  });

  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VOID_VERT}
        fragmentShader={VOID_FRAG}
        uniforms={{
          uColorHigh: { value: colors.bgHigh },
          uColorLow: { value: colors.bgLow },
          uIntensity: { value: 0 },
          uTime: { value: 0 }
        }}
        depthWrite={false}
      />
    </mesh>
  );
}

// The Spirit Orb
function SpiritOrb({ phase, colors, isActive, progressRef, tier, reduceMotion }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  
  // Refs for smooth animation
  const stateRef = useRef({ intensity: 0, expand: 0, turbulence: 0.1 });

  useFrame((state, delta) => {
    const p = progressRef.current;
    const t = state.clock.getElapsedTime();
    const s = stateRef.current;

    // --- State Logic ---
    let targetIntensity = 0;
    let targetExpand = 0;
    let targetTurbulence = 0.12; 

    if (!isActive) {
        // Idle: Gentle heartbeat
        const idle = Math.sin(t * 0.6) * 0.5 + 0.5;
        targetIntensity = idle * 0.15;
        targetExpand = idle * 0.1;
        targetTurbulence = 0.12;
    } else {
        if (phase === 'inhale') {
            targetIntensity = p; // 0 -> 1
            targetExpand = p * 1.2; // Expand significantly
            targetTurbulence = 0.2 + p * 0.2; // Growing energy
        } else if (phase === 'holdIn') {
            targetIntensity = 1.0;
            targetExpand = 1.2 + Math.sin(t * 2) * 0.05; // Tense vibration
            targetTurbulence = 0.45; // High energy held
        } else if (phase === 'exhale') {
            targetIntensity = 1.0 - p; // 1 -> 0
            targetExpand = (1.0 - p) * 1.2;
            targetTurbulence = 0.45 - p * 0.35; // Releasing energy
        } else { // holdOut/Still
            targetIntensity = 0.0;
            targetExpand = 0.0;
            targetTurbulence = 0.08; // Total stillness
        }
    }

    // --- Physics Smoothing (Spring-like) ---
    const speed = reduceMotion ? 1.0 : 3.0;
    const lerp = 1 - Math.exp(-speed * delta);
    
    s.intensity = THREE.MathUtils.lerp(s.intensity, targetIntensity, lerp);
    s.expand = THREE.MathUtils.lerp(s.expand, targetExpand, lerp);
    s.turbulence = THREE.MathUtils.lerp(s.turbulence, targetTurbulence, lerp);

    // --- Render Updates ---
    if (mat.current) {
        mat.current.uniforms.uTime.value = t;
        mat.current.uniforms.uIntensity.value = s.intensity;
        mat.current.uniforms.uExpand.value = s.expand;
        mat.current.uniforms.uTurbulence.value = s.turbulence;
        
        // Color transition
        const cSpeed = 0.08;
        mat.current.uniforms.uCoreColor.value.lerp(colors.core, cSpeed);
        mat.current.uniforms.uShellColor.value.lerp(colors.shell, cSpeed);
        mat.current.uniforms.uAccentColor.value.lerp(colors.accent, cSpeed);
    }

    // Slow organic rotation
    if (mesh.current && !reduceMotion) {
        mesh.current.rotation.y = t * 0.1;
        mesh.current.rotation.z = Math.sin(t * 0.2) * 0.1;
    }
  });

  return (
    <group>
      {/* Main Fluid Body */}
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.1, tier.geoSeg]} />
        <shaderMaterial
          ref={mat}
          vertexShader={FLUID_VERT}
          fragmentShader={FLUID_FRAG}
          uniforms={{
            uTime: { value: 0 },
            uExpand: { value: 0 },
            uTurbulence: { value: 0.1 },
            uIntensity: { value: 0 },
            uCoreColor: { value: colors.core },
            uShellColor: { value: colors.shell },
            uAccentColor: { value: colors.accent },
            uOpacity: { value: 0.85 }
          }}
          transparent={true}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Floating "Dust motes" or "Chi" particles
function ChiParticles({ count, color, isActive }: { count: number, color: THREE.Color, isActive: boolean }) {
    const points = useRef<THREE.Points>(null);
    const pos = useMemo(() => {
        const arr = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            // Random sphere distribution
            const r = 2.5 + Math.random() * 2.0;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            arr[i*3] = r * Math.sin(phi) * Math.cos(theta);
            arr[i*3+1] = r * Math.cos(phi);
            arr[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
        }
        return arr;
    }, [count]);

    useFrame((state) => {
        if (!points.current) return;
        const t = state.clock.getElapsedTime();
        // Rotate the whole cloud slowly
        points.current.rotation.y = t * 0.02;
        points.current.rotation.x = Math.sin(t * 0.1) * 0.05;
        
        // Pulse size based on activity
        const s = 1 + Math.sin(t * 0.5) * 0.05;
        points.current.scale.set(s, s, s);
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial 
                size={0.04} 
                color={color} 
                transparent 
                opacity={isActive ? 0.6 : 0.2} 
                blending={THREE.AdditiveBlending}
                sizeAttenuation 
                depthWrite={false}
            />
        </points>
    );
}

export default function OrbBreathViz(props: Props) {
  const tier = useMemo(() => resolveTier(props.quality), [props.quality]);
  const colors = useMemo(() => THEMES[props.theme] ?? THEMES.neutral, [props.theme]);

  return (
    <Canvas 
      dpr={tier.dpr} 
      camera={{ position: [0, 0, 5], fov: 35 }} 
      gl={{ 
        antialias: true, 
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      className="transition-opacity duration-1000 ease-in-out"
    >
      <LivingVoid colors={colors} isActive={props.isActive} phase={props.phase} />
      <SpiritOrb {...props} colors={colors} tier={tier} />
      <ChiParticles count={tier.particles} color={colors.accent} isActive={props.isActive} />
    </Canvas>
  );
}
