import * as THREE from 'three'
import { timeUniform } from '../core/time'
import { mulberry32 } from '../core/Noise'

const bellVertex = /* glsl */ `
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

const bellFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vWPos;
varying vec3 vNW;
varying vec3 vLocal;

void main() {
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 N = normalize(vNW);
  float fres = pow(1.0 - abs(dot(N, V)), 1.7);
  float h = clamp(vLocal.y / 0.6, 0.0, 1.0);
  float rim = smoothstep(0.0, 0.08, vLocal.y) * (1.0 - smoothstep(0.08, 0.2, vLocal.y));
  float veins = sin(vLocal.x * 26.0 + uTime * 1.1) * sin(vLocal.z * 26.0 - uTime * 0.8) * 0.5 + 0.5;
  vec3 col = mix(uColorA, uColorB, h);
  col += fres * vec3(0.5, 0.78, 1.0) * 0.6;
  col += vec3(0.15, 0.3, 0.4) * veins * 0.25;
  col += uColorA * rim * 0.8;
  float alpha = 0.07 + fres * 0.3 + veins * 0.035 + rim * 0.14;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.9));
}
`

const tentacleVertex = /* glsl */ `
uniform float uTime;
attribute float aPhase;
attribute float aT;
varying float vT;
void main() {
  vec3 p = position;
  float sway = sin(uTime * 0.95 + aPhase + aT * 2.3) * 0.17 * aT;
  float sway2 = cos(uTime * 0.72 + aPhase * 1.35 + aT * 1.7) * 0.13 * aT;
  p.x += sway;
  p.z += sway2;
  p.y += sin(uTime * 0.6 + aPhase * 2.1) * 0.05 * aT;
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const tentacleFragment = /* glsl */ `
uniform vec3 uColor;
varying float vT;
void main() {
  float alpha = (0.55 - vT * 0.4) * smoothstep(0.0, 0.12, 1.0 - vT) + 0.06;
  gl_FragColor = vec4(uColor, alpha);
}
`

interface JellySpec {
  pos: [number, number, number]
  colorA: number
  colorB: number
  scale: number
  phase: number
}

export class Jellyfish {
  readonly group = new THREE.Group()
  private jellies: Array<{
    group: THREE.Group
    bell: THREE.Mesh
    base: THREE.Vector3
    phase: number
    spec: JellySpec
  }> = []
  private materials: THREE.Material[] = []
  private geometries: THREE.BufferGeometry[] = []
  readonly pickables: THREE.Object3D[] = []

  constructor() {
    const specs: JellySpec[] = [
      { pos: [12.6, -2.4, 9.6], colorA: 0x66f2ff, colorB: 0xc9a6ff, scale: 1.05, phase: 0.0 },
      { pos: [7.2, -3.5, 13.6], colorA: 0xb48cff, colorB: 0x66f2ff, scale: 0.9, phase: 1.3 },
      { pos: [15.2, -3.9, 15.2], colorA: 0x7fffd4, colorB: 0x66f2ff, scale: 1.15, phase: 2.6 },
      { pos: [5.4, -2.0, 6.6], colorA: 0xffa8d8, colorB: 0xb48cff, scale: 0.85, phase: 3.9 },
      { pos: [16.4, -3.0, 8.2], colorA: 0x66f2ff, colorB: 0x9ff2d8, scale: 1.0, phase: 5.1 },
      { pos: [9.8, -3.15, 5.6], colorA: 0xb48cff, colorB: 0xff9ecb, scale: 0.95, phase: 4.4 },
    ]

    const bellGeo = new THREE.SphereGeometry(0.62, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.56)
    this.geometries.push(bellGeo)

    const rng = mulberry32(8080)

    for (const spec of specs) {
      const group = new THREE.Group()
      group.position.set(spec.pos[0], spec.pos[1], spec.pos[2])

      const bellMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: timeUniform,
          uColorA: { value: new THREE.Color(spec.colorA) },
          uColorB: { value: new THREE.Color(spec.colorB) },
        },
        vertexShader: bellVertex,
        fragmentShader: bellFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      this.materials.push(bellMat)
      const bell = new THREE.Mesh(bellGeo, bellMat)
      bell.userData.species = 'jellyfish'
      bell.renderOrder = 20
      group.add(bell)
      this.pickables.push(bell)

      // ---- 触须 ----
      const tentacleCount = 9
      const segments = 14
      const positions: number[] = []
      const phaseAttr: number[] = []
      const tAttr: number[] = []
      const indices: number[] = []
      let vi = 0
      for (let t = 0; t < tentacleCount; t++) {
        const a = (t / tentacleCount) * Math.PI * 2
        const phase = a + spec.phase
        const startIndex = vi
        for (let s = 0; s <= segments; s++) {
          const st = s / segments
          const radius = 0.5 + st * 0.18
          const x = Math.cos(a) * radius
          const z = Math.sin(a) * radius
          const y = 0.02 - st * (1.15 + rng() * 0.25)
          const w = 0.022 * (1 - st * 0.6)
          const tx = -Math.sin(a) * w
          const tz = Math.cos(a) * w
          positions.push(x - tx, y, z - tz, x + tx, y, z + tz)
          phaseAttr.push(phase, phase)
          tAttr.push(st, st)
          vi += 2
          if (s < segments) {
            const base = startIndex + s * 2
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
          }
        }
      }
      const tentacleGeo = new THREE.BufferGeometry()
      tentacleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      tentacleGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phaseAttr, 1))
      tentacleGeo.setAttribute('aT', new THREE.Float32BufferAttribute(tAttr, 1))
      tentacleGeo.setIndex(indices)
      this.geometries.push(tentacleGeo)

      const tentacleMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: timeUniform,
          uColor: { value: new THREE.Color(spec.colorA).lerp(new THREE.Color(spec.colorB), 0.4) },
        },
        vertexShader: tentacleVertex,
        fragmentShader: tentacleFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
      this.materials.push(tentacleMat)
      const tentacles = new THREE.Mesh(tentacleGeo, tentacleMat)
      tentacles.userData.species = 'jellyfish'
      tentacles.renderOrder = 20
      group.add(tentacles)
      this.pickables.push(tentacles)

      // ---- 内部光核 ----
      const coreGeo = new THREE.SphereGeometry(0.2, 12, 8)
      this.geometries.push(coreGeo)
      const coreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(spec.colorA).lerp(new THREE.Color(spec.colorB), 0.5),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      this.materials.push(coreMat)
      const core = new THREE.Mesh(coreGeo, coreMat)
      core.position.y = 0.18
      core.scale.set(1, 0.6, 1)
      group.add(core)

      group.scale.setScalar(spec.scale)
      this.group.add(group)
      this.jellies.push({
        group,
        bell,
        base: new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]),
        phase: spec.phase,
        spec,
      })
    }
  }

  update(elapsed: number): void {
    for (const jelly of this.jellies) {
      const { group, bell, base, phase, spec } = jelly
      const pulse = Math.sin(elapsed * 1.25 + phase)
      bell.scale.set(1 + pulse * 0.085, 1 - pulse * 0.06, 1 + pulse * 0.085)
      group.position.set(
        base.x + Math.sin(elapsed * 0.24 + phase) * 0.28,
        base.y + Math.sin(elapsed * 0.42 + phase) * 0.32 + Math.sin(elapsed * 0.9 + phase * 2) * 0.07,
        base.z + Math.cos(elapsed * 0.2 + phase) * 0.26,
      )
      group.rotation.y = Math.sin(elapsed * 0.16 + phase) * 0.35
      group.rotation.z = Math.sin(elapsed * 0.35 + phase) * 0.06
      void spec
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.group.clear()
    this.jellies.length = 0
    this.pickables.length = 0
  }
}
