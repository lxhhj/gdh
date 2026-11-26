import * as THREE from 'three'
import { timeUniform } from '../core/time'

export interface SwayOptions {
  strength?: number
  base?: number
  speed?: number
}

/**
 * 给标准材质注入顶点风摆动（支持 InstancedMesh）。
 * 顶部权重按局部 Y 渐变，树干底部不动。
 */
export function applySway(material: THREE.MeshStandardMaterial, options: SwayOptions = {}): void {
  const strength = options.strength ?? 0.05
  const base = options.base ?? 0.4
  const speed = options.speed ?? 1

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 swayOrigin = vec3(0.0);
        #ifdef USE_INSTANCING
          swayOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #endif
        float swayPhase = uTime * ${speed.toFixed(3)} + swayOrigin.x * 0.45 + swayOrigin.z * 0.33 + swayOrigin.y * 0.2;
        float swayH = max(transformed.y - ${base.toFixed(3)}, 0.0);
        transformed.x += sin(swayPhase) * ${strength.toFixed(4)} * swayH;
        transformed.z += cos(swayPhase * 0.83 + 1.2) * ${(strength * 0.6).toFixed(4)} * swayH;`,
      )
  }
  material.customProgramCacheKey = () => `sway-${strength}-${base}-${speed}`
  material.needsUpdate = true
}
