import * as THREE from 'three'
import { terrainHeight } from '../terrain/field'
import { Simplex2D } from '../core/Noise'
import { clamp, smoothstep } from '../core/math'
import { PALETTE } from '../config'
import { applySeabedCaustics } from '../materials/CausticsMaterial'

const colorNoise = new Simplex2D(7331)

export class Terrain {
  readonly mesh: THREE.Mesh
  readonly material: THREE.MeshStandardMaterial

  constructor() {
    const segments = 180
    const geometry = new THREE.PlaneGeometry(40, 40, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const position = geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      position.setY(i, terrainHeight(x, z))
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()

    const normal = geometry.attributes.normal as THREE.BufferAttribute
    const colors = new Float32Array(position.count * 3)
    const c = new THREE.Color()
    const tmp = new THREE.Color()

    const cSand = new THREE.Color(PALETTE.sand)
    const cSandWet = new THREE.Color(PALETTE.sandWet)
    const cSeaSand = new THREE.Color(PALETTE.seaSand)
    const cSeaDeep = new THREE.Color(PALETTE.seaDeep)
    const cGrass = new THREE.Color(PALETTE.grass)
    const cGrassLight = new THREE.Color(PALETTE.grassLight)
    const cGrassDeep = new THREE.Color(PALETTE.grassDeep)
    const cRock = new THREE.Color(PALETTE.rock)
    const cRockLight = new THREE.Color(PALETTE.rockLight)
    const cSnow = new THREE.Color(PALETTE.snow)

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const slope = clamp(1 - normal.getY(i), 0, 1)
      const n1 = colorNoise.fbm(x * 0.14, z * 0.14, 3) * 0.5 + 0.5
      const n2 = colorNoise.fbm(x * 0.45 + 7.3, z * 0.45 - 2.1, 2) * 0.5 + 0.5

      if (y < 0.0) {
        const depth = clamp(-y / 7.2, 0, 1)
        c.copy(cSeaSand).lerp(cSeaDeep, smoothstep(0.02, 0.95, depth))
        if (slope > 0.3) c.lerp(cRock, smoothstep(0.3, 0.7, slope) * 0.55)
        // 海底砂纹
        const ripple = Math.sin(x * 1.6 + z * 0.9) * 0.5 + 0.5
        c.lerp(cSeaSand, ripple * 0.06 * (1 - depth))
      } else if (y < 1.05) {
        c.copy(cSand).lerp(cSandWet, smoothstep(1.05, 0.05, y))
        const grassMix = smoothstep(0.35, 1.0, y) * (0.35 + n1 * 0.65)
        c.lerp(cGrass, grassMix * 0.7)
        c.lerp(cRock, smoothstep(0.4, 0.75, slope) * 0.35)
      } else {
        c.copy(cGrass).lerp(cGrassLight, n1 * 0.55)
        c.lerp(cGrassDeep, smoothstep(0.2, 0.85, n2) * 0.4)
        const rocky = clamp(smoothstep(0.3, 0.62, slope) + smoothstep(6.2, 8.1, y) * 0.8, 0, 1)
        tmp.copy(cRock).lerp(cRockLight, n2 * 0.6)
        c.lerp(tmp, rocky * 0.9)
        if (y > 7.3) c.lerp(cSnow, smoothstep(7.3, 8.55, y) * 0.55)
      }

      const variation = 0.9 + n2 * 0.18
      c.multiplyScalar(variation)

      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.02,
    })
    applySeabedCaustics(this.material)

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.name = 'terrain'
    this.mesh.receiveShadow = true
    this.mesh.castShadow = false
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
