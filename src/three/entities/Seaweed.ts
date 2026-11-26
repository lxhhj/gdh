import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { terrainHeight, UNDERWATER_HILL } from '../terrain/field'
import { mulberry32 } from '../core/Noise'
import { applySway } from '../materials/SwayMaterial'
import { PALETTE } from '../config'

interface SeabedSpot {
  x: number
  z: number
  y: number
  depth: number
}

function pickSeabed(rng: () => number, minDepth: number, maxDepth: number, reefBias = 0): SeabedSpot | null {
  for (let i = 0; i < 60; i++) {
    let x = rng() * 36 - 18
    let z = rng() * 36 - 18
    if (reefBias > 0 && rng() < reefBias) {
      x = UNDERWATER_HILL.x + (rng() - 0.5) * 9
      z = UNDERWATER_HILL.z + (rng() - 0.5) * 9
    }
    const y = terrainHeight(x, z)
    const depth = -y
    if (depth < minDepth || depth > maxDepth) continue
    return { x, z, y, depth }
  }
  return null
}

function branchCoral(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const branches: Array<[number, number, number, number, number, number]> = [
    [0, 0.35, 0, 0.12, 0.9, 0],
    [0.25, 0.3, 0.12, 0.1, 0.75, 0.35],
    [-0.27, 0.28, -0.08, 0.09, 0.7, -0.3],
    [0.05, 0.25, -0.28, 0.08, 0.6, 0.2],
    [-0.1, 0.22, 0.3, 0.08, 0.62, -0.25],
  ]
  for (const [x, y, z, r, h, tilt] of branches) {
    const cone = new THREE.ConeGeometry(r, h, 5, 1)
    cone.translate(0, h / 2, 0)
    cone.rotateZ(tilt)
    cone.translate(x, y * 0.2, z)
    parts.push(cone)
  }
  return mergeGeometries(parts)!
}

function fanCoral(): THREE.BufferGeometry {
  const positions: number[] = []
  const arcs = 16
  const baseY = 0.02
  for (let i = 0; i < arcs; i++) {
    const a0 = Math.PI * (0.08 + 0.84 * (i / arcs))
    const a1 = Math.PI * (0.08 + 0.84 * ((i + 1) / arcs))
    const r0 = 0.95 * (0.78 + 0.22 * Math.abs(Math.sin(i * 1.9)))
    const r1 = 0.95 * (0.78 + 0.22 * Math.abs(Math.sin((i + 1) * 1.9)))
    const x0 = Math.cos(a0) * r0
    const y0 = Math.sin(a0) * r0 * 1.15
    const x1 = Math.cos(a1) * r1
    const y1 = Math.sin(a1) * r1 * 1.15
    positions.push(
      0, baseY, 0,
      x0, baseY + y0, x0 * x0 * 0.16,
      x1, baseY + y1, x1 * x1 * 0.16,
    )
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}

function seaweedTuft(): THREE.BufferGeometry {
  const rand = mulberry32(9191)
  const positions: number[] = []
  const indices: number[] = []
  let vi = 0
  const bladeCount = 4
  for (let b = 0; b < bladeCount; b++) {
    const ang = (b / bladeCount) * Math.PI * 2 + rand() * 0.6
    const lean = 0.06 + rand() * 0.12
    const h = 0.9 + rand() * 0.65
    const w = 0.075 + rand() * 0.03
    const segments = 5
    const start = vi
    for (let s = 0; s <= segments; s++) {
      const t = s / segments
      const width = w * (1 - t * 0.85)
      const y = t * h
      const cx = Math.cos(ang) * lean * t + Math.sin(t * 3.2 + ang) * 0.07 * t
      const cz = Math.sin(ang) * lean * t + Math.cos(t * 2.6 + ang) * 0.07 * t
      const nx = -Math.sin(ang) * width
      const nz = Math.cos(ang) * width
      positions.push(cx - nx, y, cz - nz, cx + nx, y, cz + nz)
      vi += 2
      if (s < segments) {
        const a = start + s * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export class Seaweed {
  readonly group = new THREE.Group()
  private materials: THREE.Material[] = []
  private geometries: THREE.BufferGeometry[] = []
  private starfishMeshes: THREE.InstancedMesh | null = null
  private starData: Array<{ x: number; y: number; z: number; rot: number; scale: number }> = []
  private starDummy = new THREE.Object3D()

  constructor() {
    const rng = mulberry32(5150)
    const dummy = new THREE.Object3D()

    // ---------------- 海草 ----------------
    const bladeGeo = seaweedTuft()
    this.geometries.push(bladeGeo)
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide,
    })
    applySway(bladeMat, { strength: 0.3, base: 0.0, speed: 0.62 })
    this.materials.push(bladeMat)
    const bladeCount = 300
    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount)
    const bladeColors = [new THREE.Color(0x3fe0b0), new THREE.Color(0x2f9c7a), new THREE.Color(0x79e6a8), new THREE.Color(0x35c9d0)]
    let placed = 0
    let guard = 0
    while (placed < bladeCount && guard < 4000) {
      guard++
      const spot = pickSeabed(rng, 0.7, 4.6, 0.35)
      if (!spot) continue
      const scale = Math.min(1.15, spot.depth * 0.42) * (0.75 + rng() * 0.55)
      dummy.position.set(spot.x, spot.y - 0.05, spot.z)
      dummy.rotation.set(0, rng() * Math.PI * 2, 0)
      dummy.scale.set(0.9 + rng() * 0.5, scale, 0.9 + rng() * 0.5)
      dummy.updateMatrix()
      blades.setMatrixAt(placed, dummy.matrix)
      blades.setColorAt(placed, bladeColors[Math.floor(rng() * bladeColors.length)])
      placed++
    }
    blades.count = placed
    blades.instanceMatrix.needsUpdate = true
    if (blades.instanceColor) blades.instanceColor.needsUpdate = true
    blades.computeBoundingSphere()
    this.group.add(blades)

    // ---------------- 珊瑚 ----------------
    const coralColors = [
      new THREE.Color(0xff6f9f),
      new THREE.Color(0xff9a5c),
      new THREE.Color(0x9f7bff),
      new THREE.Color(0x4fe0d8),
    ]
    const coralMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0.04,
      flatShading: true,
      side: THREE.DoubleSide,
    })
    this.materials.push(coralMat)

    const coralSets: Array<[THREE.BufferGeometry, number, number, number]> = [
      [branchCoral(), 24, 1.0, 4.9],
      [fanCoral(), 16, 1.2, 4.6],
    ]
    for (const [geo, count, minD, maxD] of coralSets) {
      this.geometries.push(geo)
      const mesh = new THREE.InstancedMesh(geo, coralMat, count)
      let n = 0
      guard = 0
      while (n < count && guard < 800) {
        guard++
        const spot = pickSeabed(rng, minD, maxD, 0.55)
        if (!spot) continue
        dummy.position.set(spot.x, spot.y + 0.02, spot.z)
        dummy.rotation.set((rng() - 0.5) * 0.2, rng() * Math.PI * 2, (rng() - 0.5) * 0.2)
        const s = 0.55 + rng() * 0.65
        dummy.scale.set(s, s * (0.85 + rng() * 0.4), s)
        dummy.updateMatrix()
        mesh.setMatrixAt(n, dummy.matrix)
        mesh.setColorAt(n, coralColors[Math.floor(rng() * coralColors.length)])
        n++
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
      this.group.add(mesh)
    }

    // 脑珊瑚
    const brainGeo = new THREE.SphereGeometry(0.8, 12, 8)
    brainGeo.scale(1, 0.62, 1)
    this.geometries.push(brainGeo)
    const brainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, flatShading: true })
    this.materials.push(brainMat)
    const brains = new THREE.InstancedMesh(brainGeo, brainMat, 10)
    let bn = 0
    guard = 0
    while (bn < 10 && guard < 400) {
      guard++
      const spot = pickSeabed(rng, 1.4, 4.8, 0.6)
      if (!spot) continue
      dummy.position.set(spot.x, spot.y + 0.12, spot.z)
      dummy.rotation.set(0, rng() * Math.PI * 2, 0)
      const s = 0.32 + rng() * 0.42
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      brains.setMatrixAt(bn, dummy.matrix)
      brains.setColorAt(bn, coralColors[Math.floor(rng() * 2)])
      bn++
    }
    brains.count = bn
    brains.instanceMatrix.needsUpdate = true
    if (brains.instanceColor) brains.instanceColor.needsUpdate = true
    brains.computeBoundingSphere()
    this.group.add(brains)

    // ---------------- 海底岩石 ----------------
    const rockGeo = new THREE.IcosahedronGeometry(0.8, 0)
    this.geometries.push(rockGeo)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, flatShading: true })
    this.materials.push(rockMat)
    const rockCount = 24
    const reefRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount)
    const rockA = new THREE.Color(0x3d5e6b)
    const rockB = new THREE.Color(0x6d8a8f)
    let rn = 0
    guard = 0
    while (rn < rockCount && guard < 600) {
      guard++
      const spot = pickSeabed(rng, 0.8, 6.2, 0.3)
      if (!spot) continue
      dummy.position.set(spot.x, spot.y + 0.1, spot.z)
      dummy.rotation.set(rng() * 0.6, rng() * Math.PI * 2, rng() * 0.6)
      const s = 0.3 + rng() * 0.6
      dummy.scale.set(s, s * (0.5 + rng() * 0.5), s)
      dummy.updateMatrix()
      reefRocks.setMatrixAt(rn, dummy.matrix)
      reefRocks.setColorAt(rn, rockA.clone().lerp(rockB, rng()))
      rn++
    }
    reefRocks.count = rn
    reefRocks.castShadow = true
    reefRocks.receiveShadow = true
    reefRocks.instanceMatrix.needsUpdate = true
    if (reefRocks.instanceColor) reefRocks.instanceColor.needsUpdate = true
    reefRocks.computeBoundingSphere()
    this.group.add(reefRocks)

    // ---------------- 海底发光晶体 ----------------
    const crystalGeo = new THREE.OctahedronGeometry(0.42, 0)
    this.geometries.push(crystalGeo)
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xcaf7ff,
      emissive: 0x4fd8e6,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    })
    this.materials.push(crystalMat)
    const crystalCount = 14
    const crystals = new THREE.InstancedMesh(crystalGeo, crystalMat, crystalCount)
    let cn = 0
    guard = 0
    while (cn < crystalCount && guard < 300) {
      guard++
      const spot = pickSeabed(rng, 2.0, 6.0, 0.7)
      if (!spot) continue
      dummy.position.set(spot.x, spot.y + 0.25, spot.z)
      dummy.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.4)
      const s = 0.5 + rng() * 1.2
      dummy.scale.set(s, s * 1.4, s)
      dummy.updateMatrix()
      crystals.setMatrixAt(cn, dummy.matrix)
      cn++
    }
    crystals.count = cn
    crystals.instanceMatrix.needsUpdate = true
    crystals.computeBoundingSphere()
    this.group.add(crystals)

    const reefLight = new THREE.PointLight(0x66f2ff, 4, 16, 2)
    reefLight.position.set(UNDERWATER_HILL.x, -2.4, UNDERWATER_HILL.z)
    this.group.add(reefLight)

    // ---- 海星 ----
    const starShape = new THREE.Shape()
    const arms = 5
    for (let i = 0; i < arms * 2; i++) {
      const r = i % 2 === 0 ? 0.34 : 0.13
      const a = (i / (arms * 2)) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) starShape.moveTo(x, y)
      else starShape.lineTo(x, y)
    }
    starShape.closePath()
    const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.05, bevelEnabled: false })
    starGeo.rotateX(-Math.PI / 2)
    this.geometries.push(starGeo)
    const starMat = new THREE.MeshStandardMaterial({ color: 0xff9e7a, roughness: 0.8, emissive: 0xff7a55, emissiveIntensity: 0.12 })
    this.materials.push(starMat)
    this.starfishMeshes = new THREE.InstancedMesh(starGeo, starMat, 10)
    let sn = 0
    guard = 0
    while (sn < 10 && guard < 300) {
      guard++
      const spot = pickSeabed(rng, 0.8, 4.5, 0.4)
      if (!spot) continue
      const s = 0.7 + rng() * 0.9
      const rot = rng() * Math.PI * 2
      dummy.position.set(spot.x, spot.y + 0.06, spot.z)
      dummy.rotation.set(0, rot, 0)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      this.starfishMeshes.setMatrixAt(sn, dummy.matrix)
      this.starData.push({ x: spot.x, y: spot.y + 0.06, z: spot.z, rot, scale: s })
      sn++
    }
    this.starfishMeshes.count = sn
    this.starfishMeshes.instanceMatrix.needsUpdate = true
    this.starfishMeshes.computeBoundingSphere()
    this.group.add(this.starfishMeshes)
  }

  update(elapsed: number): void {
    if (!this.starfishMeshes || this.starData.length === 0) return
    // 海星原地极缓慢的呼吸与转动
    const mesh = this.starfishMeshes
    for (let i = 0; i < this.starData.length; i++) {
      const s = this.starData[i]
      const pulse = 1 + Math.sin(elapsed * 0.55 + i * 1.3) * 0.025
      this.starDummy.position.set(s.x, s.y, s.z)
      this.starDummy.rotation.set(0, s.rot + Math.sin(elapsed * 0.18 + i) * 0.05, 0)
      this.starDummy.scale.setScalar(s.scale * pulse)
      this.starDummy.updateMatrix()
      mesh.setMatrixAt(i, this.starDummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.group.clear()
  }
}
