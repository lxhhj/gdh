import * as THREE from 'three'
import { timeUniform } from '../core/time'
import { PALETTE } from '../config'

const vertexShader = /* glsl */ `
varying vec3 vWPos;
varying vec3 vNW;
varying vec3 vLocal;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vNW = normalize(mat3(modelMatrix) * normal);
  vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uRim;
uniform vec3 uViolet;

varying vec3 vWPos;
varying vec3 vNW;
varying vec3 vLocal;

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

void main() {
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 N = normalize(vNW);
  float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.4);

  float n = vnoise(vLocal * 0.085 + vec3(0.0, uTime * 0.035, uTime * 0.015));
  float bands = sin(vLocal.y * 1.35 + n * 5.0 + uTime * 0.16) * 0.5 + 0.5;

  float ex = exp(-pow(abs(abs(vLocal.x) - 19.5) / 0.55, 2.0));
  float ez = exp(-pow(abs(abs(vLocal.z) - 19.5) / 0.55, 2.0));
  float ey = exp(-pow(abs(abs(vLocal.y) - 10.5) / 0.5, 2.0));
  float edge = max(max(ex, ez), ey);

  vec3 col = mix(uDeep, uMid, 0.35 + 0.3 * n);
  col = mix(col, uRim, fres * 0.75);
  col = mix(col, uViolet, smoothstep(0.15, 1.0, vLocal.y / 11.0) * 0.3);
  col += uRim * edge * 1.05;
  col += vec3(0.05, 0.16, 0.2) * bands * 0.1;

  float alpha = (0.016 + fres * 0.16 + edge * 0.2 + n * 0.012) * uOpacity;
  alpha = clamp(alpha, 0.0, 0.58);

  gl_FragColor = vec4(col, alpha);
}
`

export interface JellyMaterialOptions {
  opacity?: number
  deep?: number
  mid?: number
  rim?: number
  violet?: number
}

export interface JellyMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
    uDeep: { value: THREE.Color }
    uMid: { value: THREE.Color }
    uRim: { value: THREE.Color }
    uViolet: { value: THREE.Color }
  }
}

export function createJellyMaterial(options: JellyMaterialOptions = {}): JellyMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uOpacity: { value: options.opacity ?? 1 },
      uDeep: { value: new THREE.Color(options.deep ?? PALETTE.jellyDeep) },
      uMid: { value: new THREE.Color(options.mid ?? PALETTE.jellyMid) },
      uRim: { value: new THREE.Color(options.rim ?? PALETTE.jellyRim) },
      uViolet: { value: new THREE.Color(options.violet ?? PALETTE.jellyViolet) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  })
  return material as JellyMaterial
}
