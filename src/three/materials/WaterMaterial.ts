import * as THREE from 'three'
import { timeUniform } from '../core/time'
import { PALETTE } from '../config'

const vertexShader = /* glsl */ `
uniform float uTime;
attribute float aDepth;

varying vec3 vWPos;
varying vec3 vNW;
varying float vDepth;

void main() {
  vec3 p = position;
  vec2 q = p.xz;
  float t = uTime;

  vec2 d1 = normalize(vec2(1.0, 0.35));
  vec2 d2 = normalize(vec2(-0.5, 1.0));
  vec2 d3 = normalize(vec2(0.7, -0.7));

  float h1 = sin(dot(q, d1) * 0.85 + t * 0.55) * 0.10;
  float h2 = sin(dot(q, d2) * 1.45 + t * 0.82) * 0.055;
  float h3 = sin(dot(q, d3) * 2.35 - t * 1.15) * 0.028;
  p.y += h1 + h2 + h3;

  float dhx = cos(dot(q, d1) * 0.85 + t * 0.55) * 0.10 * 0.85 * d1.x
            + cos(dot(q, d2) * 1.45 + t * 0.82) * 0.055 * 1.45 * d2.x
            + cos(dot(q, d3) * 2.35 - t * 1.15) * 0.028 * 2.35 * d3.x;
  float dhz = cos(dot(q, d1) * 0.85 + t * 0.55) * 0.10 * 0.85 * d1.y
            + cos(dot(q, d2) * 1.45 + t * 0.82) * 0.055 * 1.45 * d2.y
            + cos(dot(q, d3) * 2.35 - t * 1.15) * 0.028 * 2.35 * d3.y;

  vNW = normalize(vec3(-dhx, 1.0, -dhz));
  vDepth = aDepth;

  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uFoam;

varying vec3 vWPos;
varying vec3 vNW;
varying float vDepth;

void main() {
  if (vDepth < 0.02) discard;

  vec3 V = normalize(cameraPosition - vWPos);
  vec3 N = normalize(vNW);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

  vec3 col = mix(uDeep, uMid, smoothstep(7.0, 2.2, vDepth));
  col = mix(col, uShallow, smoothstep(2.2, 0.25, vDepth));

  float ripple = sin(vWPos.x * 2.3 + uTime * 1.2) * cos(vWPos.z * 2.1 - uTime * 0.9);
  col += ripple * 0.018;

  // 掠射角天空反光，让水面在任何角度都能被看见
  col = mix(col, vec3(0.05, 0.2, 0.3), fres * 0.45);

  // 波峰高光
  float crest = smoothstep(0.015, 0.16, 1.0 - N.y);
  col += vec3(0.1, 0.3, 0.38) * crest;

  float depthAlpha = smoothstep(0.2, 5.5, vDepth);
  float alpha = (mix(0.48, 0.8, fres) + depthAlpha * 0.12 + crest * 0.06) * uOpacity;

  // 岸边浪花
  float foamBand = smoothstep(1.55, 0.2, vDepth);
  float foamNoise = sin(vWPos.x * 3.1 + uTime * 1.7) * sin(vWPos.z * 2.7 - uTime * 1.2) * 0.5 + 0.5;
  float foam = smoothstep(0.42, 0.95, foamBand * (0.5 + 0.75 * foamNoise)) * 0.55;
  col = mix(col, uFoam, foam);
  alpha = max(alpha, foam * 0.8);

  // 太阳高光
  vec3 lightDir = normalize(vec3(0.4, 0.85, 0.35));
  vec3 H = normalize(lightDir + V);
  float spec = pow(max(dot(N, H), 0.0), 130.0) * 0.55;
  col += vec3(0.6, 0.9, 1.0) * spec;

  // 细微水面闪光
  float sparkle = pow(max(sin(vWPos.x * 7.0 + uTime * 2.0) * sin(vWPos.z * 6.0 - uTime * 1.6), 0.0), 26.0);
  col += vec3(0.25, 0.6, 0.75) * sparkle * 0.2;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
}
`

export interface WaterMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uTime: { value: number }
    uOpacity: { value: number }
    uDeep: { value: THREE.Color }
    uMid: { value: THREE.Color }
    uShallow: { value: THREE.Color }
    uFoam: { value: THREE.Color }
  }
}

export function createWaterMaterial(): WaterMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uOpacity: { value: 0.66 },
      uDeep: { value: new THREE.Color(PALETTE.waterDeep) },
      uMid: { value: new THREE.Color(PALETTE.waterMid) },
      uShallow: { value: new THREE.Color(PALETTE.waterShallow) },
      uFoam: { value: new THREE.Color(PALETTE.foam) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  return material as WaterMaterial
}
