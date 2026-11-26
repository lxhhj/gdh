import * as THREE from 'three'
import { terrainHeight, UNDERWATER_HILL } from '../terrain/field'
import { mulberry32 } from '../core/Noise'
import { timeUniform } from '../core/time'
import { QUALITY } from '../config'
import { clamp } from '../core/math'

const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uOpacity;
uniform float uSizeBoost;

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
attribute vec3 aDrift;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.17 + aPhase) * aDrift.x;
  p.y += sin(uTime * 0.12 + aPhase * 1.7) * aDrift.y;
  p.z += cos(uTime * 0.15 + aPhase * 1.3) * aDrift.z;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = max(-mv.z, 1.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.7 + fract(aPhase) * 1.5) + aPhase * 6.283);

  vAlpha = (0.14 + 0.4 * twinkle) * uOpacity;
  vColor = aColor;

  gl_PointSize = clamp(aSize * uSizeBoost * uPixelRatio * (430.0 / dist), 1.0, 24.0);
  gl_Position = projectionMatrix * mv;
}
`

const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float d = length(pc);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.04, d);
  float core = smoothstep(0.17, 0.0, d);
  vec3 col = vColor * (0.7 + core * 0.7);
  gl_FragColor = vec4(col, soft * vAlpha);
}
`

const bubbleVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uOpacity;
attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
varying float vAlpha;
void main() {
  float cycle = fract(uTime * aSpeed + aPhase);
  vec3 p = position;
  p.y = mix(position.y, 0.06, cycle);
  p.x += sin(uTime * 0.7 + aPhase * 18.0) * 0.16 * cycle;
  p.z += cos(uTime * 0.55 + aPhase * 15.0) * 0.16 * cycle;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = max(-mv.z, 1.0);
  vAlpha = (0.45 + 0.3 * sin(uTime * 2.0 + aPhase * 12.0)) * (1.0 - cycle * 0.7) * uOpacity;
  gl_PointSize = clamp(aSize * uPixelRatio * (330.0 / dist), 1.0, 18.0);
  gl_Position = projectionMatrix * mv;
}
`

const bubbleFragment = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float d = length(pc);
  float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.26, 0.34, d);
  float highlight = smoothstep(0.16, 0.0, length(pc - vec2(0.14, 0.16)));
  float alpha = ring * 0.55 + highlight * 0.8;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vec3(0.72, 0.94, 1.0), alpha * vAlpha);
}
`

export class Particles {
  readonly group = new THREE.Group()
  private fieldGeometry: THREE.BufferGeometry
  private fieldMaterial: THREE.ShaderMaterial
  private bubblesGeometry: THREE.BufferGeometry
  private bubblesMaterial: THREE.ShaderMaterial
  private crystals: THREE.InstancedMesh
  private crystalGeometry: THREE.BufferGeometry
  private crystalMaterial: THREE.MeshStandardMaterial
  private planktonGeometry: THREE.BufferGeometry
  private planktonMaterial: THREE.ShaderMaterial
  private materials: THREE.Material[] = []
  private geometries: THREE.BufferGeometry[] = []
  private maxCount: number = QUALITY.maxParticles
  private currentCount: number = QUALITY.baseParticles
  readonly bubbleCount = 280
  readonly crystalCount = 90
  readonly planktonCount = 240

  constructor() {
    const rng = mulberry32(31415)

    // ---------------- 空间果冻颗粒 ----------------
    const max = this.maxCount
    const positions = new Float32Array(max * 3)
    const sizes = new Float32Array(max)
    const phases = new Float32Array(max)
    const colors = new Float32Array(max * 3)
    const drifts = new Float32Array(max * 3)

    const palette = [
      new THREE.Color(0x6fe8ff),
      new THREE.Color(0x3fa8e0),
      new THREE.Color(0xa88cff),
      new THREE.Color(0x6fe8c8),
      new THREE.Color(0x4f6fd0),
      new THREE.Color(0xa8e8f0),
    ]
    const color = new THREE.Color()

    let placed = 0
    let guard = 0
    while (placed < max && guard < max * 8) {
      guard++
      const x = rng() * 38.2 - 19.1
      const z = rng() * 38.2 - 19.1
      const y = rng() * 17.5 - 7.0
      const belowBase = y < -7.55 && y > -10.6
      if (!belowBase && y < terrainHeight(x, z) + 0.35) continue
      if (y > 10.6) continue

      positions[placed * 3] = x
      positions[placed * 3 + 1] = y
      positions[placed * 3 + 2] = z
      sizes[placed] = 0.06 + Math.pow(rng(), 2.2) * 0.36
      phases[placed] = rng() * Math.PI * 2
      color.copy(palette[Math.floor(rng() * palette.length)])
      colors[placed * 3] = color.r
      colors[placed * 3 + 1] = color.g
      colors[placed * 3 + 2] = color.b
      drifts[placed * 3] = 0.2 + rng() * 0.8
      drifts[placed * 3 + 1] = 0.3 + rng() * 1.2
      drifts[placed * 3 + 2] = 0.2 + rng() * 0.8
      placed++
    }
    this.maxCount = placed

    this.fieldGeometry = new THREE.BufferGeometry()
    this.fieldGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.fieldGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    this.fieldGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    this.fieldGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    this.fieldGeometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 3))
    this.fieldGeometry.setDrawRange(0, Math.min(this.currentCount, this.maxCount))
    this.fieldGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 30)
    this.geometries.push(this.fieldGeometry)

    this.fieldMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: timeUniform,
        uPixelRatio: { value: 1.5 },
        uOpacity: { value: 0.8 },
        uSizeBoost: { value: 1.0 },
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.materials.push(this.fieldMaterial)
    const field = new THREE.Points(this.fieldGeometry, this.fieldMaterial)
    field.frustumCulled = false
    field.renderOrder = 16
    field.raycast = () => {}
    this.group.add(field)

    // ---------------- 海底气泡 ----------------
    const bubbleN = this.bubbleCount
    const bPositions = new Float32Array(bubbleN * 3)
    const bPhases = new Float32Array(bubbleN)
    const bSpeeds = new Float32Array(bubbleN)
    const bSizes = new Float32Array(bubbleN)
    let bn = 0
    guard = 0
    while (bn < bubbleN && guard < 5000) {
      guard++
      const x = rng() * 36 - 18
      const z = rng() * 36 - 18
      const depth = -terrainHeight(x, z)
      if (depth < 0.9) continue
      bPositions[bn * 3] = x
      bPositions[bn * 3 + 1] = -depth + 0.25
      bPositions[bn * 3 + 2] = z
      bPhases[bn] = rng()
      bSpeeds[bn] = 0.025 + rng() * 0.045
      bSizes[bn] = 0.035 + rng() * 0.1
      bn++
    }
    this.bubblesGeometry = new THREE.BufferGeometry()
    this.bubblesGeometry.setAttribute('position', new THREE.BufferAttribute(bPositions, 3))
    this.bubblesGeometry.setAttribute('aPhase', new THREE.BufferAttribute(bPhases, 1))
    this.bubblesGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(bSpeeds, 1))
    this.bubblesGeometry.setAttribute('aSize', new THREE.BufferAttribute(bSizes, 1))
    this.geometries.push(this.bubblesGeometry)
    this.bubblesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: timeUniform,
        uPixelRatio: { value: 1.5 },
        uOpacity: { value: 0.8 },
      },
      vertexShader: bubbleVertex,
      fragmentShader: bubbleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.materials.push(this.bubblesMaterial)
    const bubbles = new THREE.Points(this.bubblesGeometry, this.bubblesMaterial)
    bubbles.frustumCulled = false
    bubbles.renderOrder = 16
    bubbles.raycast = () => {}
    this.group.add(bubbles)

    // ---------------- 中近景晶体颗粒 ----------------
    this.crystalGeometry = new THREE.OctahedronGeometry(0.09, 0)
    this.geometries.push(this.crystalGeometry)
    this.crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4f7ff,
      emissive: 0x4fa8c8,
      emissiveIntensity: 0.7,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
    this.crystalMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = timeUniform
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aPhase;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float cAng = uTime * 0.2 + aPhase;
          float cCos = cos(cAng);
          float cSin = sin(cAng);
          transformed.xz = mat2(cCos, -cSin, cSin, cCos) * transformed.xz;
          transformed.y += sin(uTime * 0.42 + aPhase * 1.7) * 0.22;`,
        )
    }
    this.crystalMaterial.customProgramCacheKey = () => 'crystal-particles'
    this.materials.push(this.crystalMaterial)

    const crystalPhases = new Float32Array(this.crystalCount)
    this.crystals = new THREE.InstancedMesh(this.crystalGeometry, this.crystalMaterial, this.crystalCount)
    const dummy = new THREE.Object3D()
    let cn = 0
    guard = 0
    while (cn < this.crystalCount && guard < 3000) {
      guard++
      const x = rng() * 37 - 18.5
      const z = rng() * 37 - 18.5
      const y = rng() * 16.5 - 6.2
      if (y < terrainHeight(x, z) + 0.4) continue
      dummy.position.set(x, y, z)
      dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
      const s = 0.35 + rng() * 1.25
      dummy.scale.set(s, s * (1 + rng()), s)
      dummy.updateMatrix()
      this.crystals.setMatrixAt(cn, dummy.matrix)
      crystalPhases[cn] = rng() * Math.PI * 2
      cn++
    }
    this.crystals.count = cn
    this.crystalGeometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(crystalPhases, 1))
    this.crystals.instanceMatrix.needsUpdate = true
    this.crystals.computeBoundingSphere()
    this.crystals.raycast = () => {}
    this.group.add(this.crystals)

    // ---------------- 发光浮游生物 ----------------
    const planktonN = this.planktonCount
    const pPositions = new Float32Array(planktonN * 3)
    const pSizes = new Float32Array(planktonN)
    const pPhases = new Float32Array(planktonN)
    const pColors = new Float32Array(planktonN * 3)
    const pDrifts = new Float32Array(planktonN * 3)
    for (let i = 0; i < planktonN; i++) {
      const a = rng() * Math.PI * 2
      const r = Math.pow(rng(), 0.6) * 5.2
      pPositions[i * 3] = UNDERWATER_HILL.x + Math.cos(a) * r
      pPositions[i * 3 + 1] = -2.2 - rng() * 3.2
      pPositions[i * 3 + 2] = UNDERWATER_HILL.z + Math.sin(a) * r
      pSizes[i] = 0.03 + rng() * 0.08
      pPhases[i] = rng() * Math.PI * 2
      color.setHex(rng() < 0.5 ? 0x9ff2d8 : 0x86f6ff)
      pColors[i * 3] = color.r
      pColors[i * 3 + 1] = color.g
      pColors[i * 3 + 2] = color.b
      pDrifts[i * 3] = 0.3
      pDrifts[i * 3 + 1] = 0.4
      pDrifts[i * 3 + 2] = 0.3
    }
    this.planktonGeometry = new THREE.BufferGeometry()
    this.planktonGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
    this.planktonGeometry.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1))
    this.planktonGeometry.setAttribute('aPhase', new THREE.BufferAttribute(pPhases, 1))
    this.planktonGeometry.setAttribute('aColor', new THREE.BufferAttribute(pColors, 3))
    this.planktonGeometry.setAttribute('aDrift', new THREE.BufferAttribute(pDrifts, 3))
    this.geometries.push(this.planktonGeometry)
    this.planktonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: timeUniform,
        uPixelRatio: { value: 1.5 },
        uOpacity: { value: 1 },
        uSizeBoost: { value: 0.5 },
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
    this.materials.push(this.planktonMaterial)
    const plankton = new THREE.Points(this.planktonGeometry, this.planktonMaterial)
    plankton.frustumCulled = false
    plankton.renderOrder = 16
    plankton.raycast = () => {}
    this.group.add(plankton)
  }

  setDensity(ratio: number): void {
    this.currentCount = Math.round(clamp(QUALITY.baseParticles * ratio, 1200, this.maxCount))
    this.fieldGeometry.setDrawRange(0, this.currentCount)
  }

  get count(): number {
    return this.currentCount
  }

  setPixelRatio(ratio: number): void {
    this.fieldMaterial.uniforms.uPixelRatio.value = ratio
    this.bubblesMaterial.uniforms.uPixelRatio.value = ratio
    this.planktonMaterial.uniforms.uPixelRatio.value = ratio
  }

  setCameraDistance(distance: number): void {
    const far = clamp((distance - 24) / 50, 0, 1)
    this.fieldMaterial.uniforms.uSizeBoost.value = 0.9 + far * 0.5
    this.fieldMaterial.uniforms.uOpacity.value = 0.62 + far * 0.22
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.crystals.dispose()
    this.group.clear()
  }
}
