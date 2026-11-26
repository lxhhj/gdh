import * as THREE from 'three'
import { timeUniform } from '../core/time'

const CAUSTIC_CHUNK = /* glsl */ `
uniform float uTime;
varying vec3 vJellyWorld;

float jellyCaustic(vec2 p, float t) {
  vec2 q = p;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    q = mat2(0.8, -0.6, 0.6, 0.8) * q * 1.31;
    c += sin(q.x * 1.7 + t * (0.55 + fi * 0.22)) * sin(q.y * 1.9 - t * (0.48 + fi * 0.18));
  }
  return pow(abs(c / 3.0), 3.0);
}
`

/**
 * 在海床（世界坐标 y < 0）叠加缓慢流动的焦散光斑。
 */
export function applySeabedCaustics(material: THREE.MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vJellyWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vJellyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CAUSTIC_CHUNK}`)
      .replace(
        '#include <opaque_fragment>',
        `
        if (vJellyWorld.y < -0.15) {
          float depthFade = smoothstep(-0.15, -2.2, vJellyWorld.y);
          float ca = jellyCaustic(vJellyWorld.xz * 0.62, uTime * 0.32);
          outgoingLight += vec3(0.12, 0.5, 0.58) * ca * depthFade * 0.75;
        }
        #include <opaque_fragment>`,
      )
  }
  material.customProgramCacheKey = () => 'seabed-caustics'
  material.needsUpdate = true
}
