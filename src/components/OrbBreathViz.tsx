
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

// ----- Palette: "Sắc Pháp" (The Colors of Dharma) - REFINED -----
const THEMES = {
  warm: {
    // "Tâm Từ" (Metta): Liquid Gold & Warm Ember
    bgHigh: new THREE.Color("#1a0b00"), 
    bgLow: new THREE.Color("#000000"),
    core: new THREE.Color("#ff9f43"),
    shell: new THREE.Color("#ff6b6b"), 
    accent: new THREE.Color("#feca57"),
    glow: new THREE.Color("#ff7675")
  },
  cool: {
    // "Tâm Xả" (Upekkha): Deep Bioluminescence
    bgHigh: new THREE.Color("#001e1d"),
    bgLow: new THREE.Color("#000000"),
    core: new THREE.Color("#00d2d3"),
    shell: new THREE.Color("#2e86de"),
    accent: new THREE.Color("#48dbfb"),
    glow: new THREE.Color("#0abde3")
  },
  neutral: {
    // "Chân Như" (Tathata): Ethereal Spirit / Pearl
    bgHigh: new THREE.Color("#0d0d12"),
    bgLow: new THREE.Color("#000000"),
    core: new THREE.Color("#c8d6e5"),
    shell: new THREE.Color("#8395a7"),
    accent: new THREE.Color("#ffffff"),
    glow: new THREE.Color("#a4b0be")
  },
} as const;

// ----- Quality Tier Resolution -----
function resolveTier(q: QualityTier) {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const isLow = q === "low";
  // We prioritize high segment count for the smooth organic look
  return { 
    dpr: isLow ? Math.min(dpr, 1) : Math.min(dpr, 1.5), 
    geoSeg: isLow ? 64 : 128, 
    particles: isLow ? 30 : 150
  };
}

// ==========================================
// MASTERPIECE SHADERS: "THE LUMINOUS PEARL"
// ==========================================

// --- Common Noise Functions (FBM for richness) ---
const NOISE_CHUNK = `
// Simplex 3D Noise 
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

// Fractal Brownian Motion for rich detail
float fbm(vec3 x) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100.0);
  for (int i = 0; i < 3; ++i) {
    v += a * snoise(x);
    x = x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
`;

// 1. NEBULA VOID SHADER (Background)
const VOID_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;
const VOID_FRAG = `
varying vec2 vUv;
uniform vec3 uColorHigh;
uniform vec3 uColorLow;
uniform float uTime;
uniform float uIntensity; // Breath intensity

${NOISE_CHUNK}

void main() {
  vec2 uv = vUv;
  
  // Ethereal Flows
  float t = uTime * 0.05;
  float flow1 = snoise(vec3(uv * 1.8 + vec2(0, t), t));
  float flow2 = snoise(vec3(uv * 3.5 - vec2(t*0.5, 0), t * 1.5));
  
  // Combine for nebula look
  float nebula = (flow1 + flow2 * 0.6) * 0.5;
  
  // Radial Gradient (Vignette)
  float dist = length(uv - 0.5);
  float vignette = smoothstep(0.9, 0.2, dist);
  
  // Breath Interaction: The void brightens slightly on inhale
  float breathGlow = uIntensity * 0.15;
  
  // Color Mixing
  vec3 bg = mix(uColorLow, uColorHigh, vignette * (0.3 + breathGlow));
  
  // Add subtle stars/dust in background noise
  float starNoise = pow(max(0.0, snoise(vec3(uv * 20.0, uTime * 0.1))), 8.0);
  bg += starNoise * 0.05;

  // Add the nebula clouds
  vec3 cloudColor = mix(uColorLow, uColorHigh * 1.2, smoothstep(-0.2, 0.6, nebula));
  vec3 final = mix(bg, cloudColor, 0.2);

  // Dither to prevent banding
  float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
  final += (noise - 0.5) * 0.01;

  gl_FragColor = vec4(final, 1.0);
}
`;

// 2. THE PEARL SHADER (The Orb)
const PEARL_VERT = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPos;
varying float vNoise; // Pass noise to frag for internal glow mapping

uniform float uTime;
uniform float uExpand;     
uniform float uTurbulence; 
uniform float uRoughness;

${NOISE_CHUNK}

void main() {
  vec3 p = position;
  
  // 1. Liquid Movement (FBM for organic feel)
  // INCREASED FREQUENCY (multiplied p by 1.5) to create smaller surface ripples instead of big blobs
  float n = fbm(p * (1.5 + uRoughness) + vec3(0.0, uTime * 0.2, 0.0));
  
  // 2. Detail Noise
  float d = snoise(p * 3.0 - uTime * 0.3);
  
  // Combine
  // uTurbulence will be kept small in JS to ensure roundness
  float combined = (n + d * 0.2) * uTurbulence; 
  vNoise = combined;

  // 3. Displacement
  // Push vertices along normal based on noise + breath expansion
  // Added dampening to the noise contribution (combined * 0.5) to keep it subtle
  vec3 newPos = p + normal * (combined * 0.5 + uExpand * 0.25);

  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  vWorldPos = (modelMatrix * vec4(newPos, 1.0)).xyz;
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const PEARL_FRAG = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;
varying vec3 vWorldPos;

uniform vec3 uCoreColor;
uniform vec3 uShellColor;
uniform vec3 uAccentColor;
uniform vec3 uGlowColor;
uniform float uOpacity;
uniform float uIntensity; // 0 to 1 (Breath)

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // 1. Fresnel Effect (Rim Light - The "Glass" look)
  float fresnelBase = dot(normal, viewDir);
  float fresnel = pow(1.0 - abs(fresnelBase), 3.0); // Sharper rim
  
  // 2. Iridescence (Thin film interference simulation)
  // Shift the fresnel slightly for different color channels to create a rainbow rim
  vec3 iridescence;
  iridescence.r = pow(1.0 - abs(fresnelBase * 0.98), 4.0);
  iridescence.g = pow(1.0 - abs(fresnelBase * 1.00), 4.0);
  iridescence.b = pow(1.0 - abs(fresnelBase * 1.02), 4.0);
  
  // 3. Inner Body (Subsurface Scattering approximation)
  // Mapping noise to color depth - boosted slightly for visibility since noise is lower
  float depth = smoothstep(-0.2, 0.4, vNoise * 2.0);
  
  // Mix Colors
  // Base: Shell -> Core based on depth/noise
  vec3 col = mix(uShellColor, uCoreColor, depth);
  
  // Add Pulse/Intensity (Breath)
  col = mix(col, uGlowColor, uIntensity * 0.6 * depth);
  
  // Apply Iridescent Rim (The "Jewel" shine)
  col += iridescence * uAccentColor * (0.8 + uIntensity * 0.4);
  
  // 4. Alpha/Opacity Logic
  // Center is more transparent (x-ray), edges are opaque
  float alpha = uOpacity * (0.15 + fresnel * 0.85);
  
  // Enhance glow on inhale
  col *= (1.0 + uIntensity * 0.3);

  gl_FragColor = vec4(col, alpha);
}
`;

// ----- Components -----

// Background: The Infinite
function InfiniteVoid({ colors, isActive, phase }: { colors: typeof THEMES['neutral'], isActive: boolean, phase: BreathPhase }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const intensityRef = useRef(0);

  useFrame((state, dt) => {
    if (mat.current) {
        const target = (isActive && (phase === 'inhale' || phase === 'holdIn')) ? 1.0 : 0.0;
        intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, target, dt * 0.5);

        mat.current.uniforms.uTime.value = state.clock.elapsedTime;
        mat.current.uniforms.uColorHigh.value.lerp(colors.bgHigh, 0.05);
        mat.current.uniforms.uColorLow.value.lerp(colors.bgLow, 0.05);
        mat.current.uniforms.uIntensity.value = intensityRef.current;
    }
  });

  return (
    <mesh position={[0, 0, -8]}>
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

// Main Object: The Luminous Pearl
function LuminousPearl({ phase, colors, isActive, progressRef, tier, reduceMotion }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  const coreMesh = useRef<THREE.Mesh>(null); // Inner solid core
  const mat = useRef<THREE.ShaderMaterial>(null);
  
  // Physics State
  const stateRef = useRef({ intensity: 0, expand: 0, turbulence: 0.1 });

  useFrame((state, delta) => {
    const p = progressRef.current;
    const t = state.clock.getElapsedTime();
    const s = stateRef.current;

    // --- Dynamic Breath Logic (ADJUSTED FOR SPHERICAL PERFECTION) ---
    // Reduced turbulence significantly to keep it round (Sắc tức thị Không)
    let targetIntensity = 0;
    let targetExpand = 0;
    let targetTurbulence = 0.02; // Very low base turbulence

    if (!isActive) {
        // Idle: "Sleep" state
        const idle = Math.sin(t * 0.5) * 0.5 + 0.5;
        targetIntensity = idle * 0.1;
        targetExpand = idle * 0.05;
        targetTurbulence = 0.03;
    } else {
        if (phase === 'inhale') {
            targetIntensity = p; // 0 -> 1
            targetExpand = p * 1.5; 
            targetTurbulence = 0.05 + p * 0.05; // Max 0.10 (was 0.3)
        } else if (phase === 'holdIn') {
            targetIntensity = 1.0;
            targetExpand = 1.5 + Math.sin(t * 4) * 0.015; // Faster, tighter vibration
            targetTurbulence = 0.12; // Held tension, but controlled (was 0.35)
        } else if (phase === 'exhale') {
            targetIntensity = 1.0 - p; // 1 -> 0
            targetExpand = (1.0 - p) * 1.5;
            targetTurbulence = 0.12 - p * 0.08; // Relaxing back to 0.04
        } else { // holdOut
            targetIntensity = 0.0;
            targetExpand = 0.0;
            targetTurbulence = 0.02; // Absolute stillness, perfect sphere
        }
    }

    // --- Smoothing (Liquid feel) ---
    const speed = reduceMotion ? 1.0 : 2.5;
    const lerp = 1 - Math.exp(-speed * delta);
    
    s.intensity = THREE.MathUtils.lerp(s.intensity, targetIntensity, lerp);
    s.expand = THREE.MathUtils.lerp(s.expand, targetExpand, lerp);
    s.turbulence = THREE.MathUtils.lerp(s.turbulence, targetTurbulence, lerp);

    // --- Update Shader ---
    if (mat.current) {
        mat.current.uniforms.uTime.value = t;
        mat.current.uniforms.uIntensity.value = s.intensity;
        mat.current.uniforms.uExpand.value = s.expand;
        mat.current.uniforms.uTurbulence.value = s.turbulence;
        
        // Color transition
        const cSpeed = 0.06;
        mat.current.uniforms.uCoreColor.value.lerp(colors.core, cSpeed);
        mat.current.uniforms.uShellColor.value.lerp(colors.shell, cSpeed);
        mat.current.uniforms.uAccentColor.value.lerp(colors.accent, cSpeed);
        mat.current.uniforms.uGlowColor.value.lerp(colors.glow, cSpeed);
    }

    // Update Inner Core Scale (The "Sun" inside)
    if (coreMesh.current) {
        const coreScale = 0.4 + s.intensity * 0.3; // Core grows slightly with breath
        coreMesh.current.scale.setScalar(coreScale);
    }

    // Gentle Rotation
    if (mesh.current && !reduceMotion) {
        mesh.current.rotation.y = t * 0.05;
        mesh.current.rotation.z = Math.sin(t * 0.15) * 0.05;
    }
  });

  return (
    <group>
      {/* 1. The Inner Core (Solid Light) */}
      <mesh ref={coreMesh}>
         <sphereGeometry args={[1, 32, 32]} />
         <meshBasicMaterial 
            color={colors.core} 
            transparent 
            opacity={0.8} 
            blending={THREE.AdditiveBlending} 
         />
      </mesh>

      {/* 2. The Outer Fluid Shell (The Pearl) */}
      <mesh ref={mesh}>
        {/* SphereGeometry creates nicer flow than Icosahedron for this shader */}
        <sphereGeometry args={[1.2, tier.geoSeg, tier.geoSeg]} />
        <shaderMaterial
          ref={mat}
          vertexShader={PEARL_VERT}
          fragmentShader={PEARL_FRAG}
          uniforms={{
            uTime: { value: 0 },
            uExpand: { value: 0 },
            uTurbulence: { value: 0.02 },
            uRoughness: { value: 0.8 }, // Roughness of noise
            uIntensity: { value: 0 },
            uCoreColor: { value: colors.core },
            uShellColor: { value: colors.shell },
            uAccentColor: { value: colors.accent },
            uGlowColor: { value: colors.glow },
            uOpacity: { value: 0.8 }
          }}
          transparent={true}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false} // Important for internal transparency look
        />
      </mesh>
    </group>
  );
}

// "Stardust" Particles - Drifting energy
function Stardust({ count, color, isActive }: { count: number, color: THREE.Color, isActive: boolean }) {
    const points = useRef<THREE.Points>(null);
    
    // Initial positions + random offsets
    const [pos, randoms] = useMemo(() => {
        const p = new Float32Array(count * 3);
        const r = new Float32Array(count * 3); // Random velocities/offsets
        for(let i=0; i<count; i++) {
            // Distribution: Hollow sphere cloud
            const rad = 2.8 + Math.random() * 2.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            p[i*3] = rad * Math.sin(phi) * Math.cos(theta);
            p[i*3+1] = rad * Math.cos(phi);
            p[i*3+2] = rad * Math.sin(phi) * Math.sin(theta);
            
            r[i*3] = (Math.random() - 0.5) * 0.01;   // x velocity
            r[i*3+1] = (Math.random() - 0.5) * 0.01; // y velocity
            r[i*3+2] = Math.random();                // phase offset
        }
        return [p, r];
    }, [count]);

    useFrame((state) => {
        if (!points.current) return;
        const t = state.clock.getElapsedTime();
        
        // Pulse visibility
        const baseOpacity = isActive ? 0.5 : 0.15;
        
        // Manual particle animation in JS (lightweight enough for <200 points)
        // Ideally done in vertex shader for massive counts, but this allows easier react state integration
        const positions = points.current.geometry.attributes.position.array as Float32Array;
        
        for(let i=0; i<count; i++) {
             // Orbit logic
             const x = pos[i*3];
             const z = pos[i*3+2];
             
             // Rotate around Y axis slowly
             const angle = t * 0.05 + randoms[i*3+2];
             const rx = x * Math.cos(angle) - z * Math.sin(angle);
             const rz = x * Math.sin(angle) + z * Math.cos(angle);
             
             positions[i*3] = rx;
             positions[i*3+1] = pos[i*3+1] + Math.sin(t + i) * 0.1; // Bobbing
             positions[i*3+2] = rz;
        }
        points.current.geometry.attributes.position.needsUpdate = true;
        
        // Breathing scale
        const scale = isActive ? 1.0 + Math.sin(t) * 0.1 : 1.0;
        points.current.scale.setScalar(scale);
        
        // Material Update
        (points.current.material as THREE.PointsMaterial).opacity = baseOpacity;
        (points.current.material as THREE.PointsMaterial).color.lerp(color, 0.05);
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial 
                size={0.06} 
                color={color} 
                transparent 
                opacity={0.3} 
                blending={THREE.AdditiveBlending}
                sizeAttenuation 
                depthWrite={false}
                map={getGlowSprite()} // Helper to create soft circle
            />
        </points>
    );
}

// Cached texture generation for particles
let _glowSprite: THREE.Texture;
function getGlowSprite() {
    if (_glowSprite) return _glowSprite;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
    }
    _glowSprite = new THREE.CanvasTexture(canvas);
    return _glowSprite;
}

export default function OrbBreathViz(props: Props) {
  const tier = useMemo(() => resolveTier(props.quality), [props.quality]);
  const colors = useMemo(() => THEMES[props.theme] ?? THEMES.neutral, [props.theme]);

  return (
    <Canvas 
      dpr={tier.dpr} 
      camera={{ position: [0, 0, 6], fov: 35 }} 
      gl={{ 
        antialias: true, 
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping, // Filmic for that cinematic contrast
        toneMappingExposure: 1.2,
      }}
      className="transition-opacity duration-1000 ease-in-out"
    >
      <InfiniteVoid colors={colors} isActive={props.isActive} phase={props.phase} />
      <LuminousPearl {...props} colors={colors} tier={tier} />
      <Stardust count={tier.particles} color={colors.accent} isActive={props.isActive} />
    </Canvas>
  );
}
