import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { terrainHeight, terrainSlope, LAKE, CABIN_PAD } from '../terrain/field'
import { polylineDistance, PATH_PTS, STREAM_PTS, BRIDGE } from '../layout'
import { mulberry32 } from '../core/Noise'
import { applySway } from '../materials/SwayMaterial'
import { PALETTE } from '../config'

interface Placement {
  x: number
  z: number
  y: number
  scale: number
  rot: number
}

function coniferCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const tiers: Array<[number, number, number]> = [
    [1.75, 1.0, 1.55],
    [2.7, 0.8, 1.35],
    [3.5, 0.52, 1.1],
  ]
  for (const [y, r, h] of tiers) {
    const cone = new THREE.ConeGeometry(r, h, 7, 1)
    cone.translate(0, y, 0)
    parts.push(cone)
  }
  return mergeGeometries(parts)!
}

function broadleafCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const blobs: Array<[number, number, number, number]> = [
    [0, 2.25, 0, 1.0],
    [0.72, 2.6, 0.35, 0.78],
    [-0.62, 2.5, -0.38, 0.72],
    [0.12, 3.15, -0.18, 0.7],
    [-0.2, 2.1, 0.62, 0.55],
  ]
  for (const [x, y, z, s] of blobs) {
    const ico = new THREE.IcosahedronGeometry(s, 0)
    ico.scale(1, 0.85, 1)
    ico.translate(x, y, z)
    parts.push(ico)
  }
  return mergeGeometries(parts)!
}

function grassTuft(): THREE.BufferGeometry {
  const positions: number[] = []
  const rand = mulberry32(4242)
  for (let b = 0; b < 6; b++) {
    const ang = (b / 6) * Math.PI * 2 + rand() * 0.7
    const rad = 0.04 + rand() * 0.11
    const bx = Math.cos(ang) * rad
    const bz = Math.sin(ang) * rad
    const h = 0.3 + rand() * 0.42
    const w = 0.045
    const px = -Math.sin(ang) * w
    const pz = Math.cos(ang) * w
    const tipX = bx + Math.cos(ang) * 0.16
    const tipZ = bz + Math.sin(ang) * 0.16
    positions.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tipX, h, tipZ)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}

export class Forest {
  readonly group = new THREE.Group()
  private materials: THREE.Material[] = []
  private geometries: THREE.BufferGeometry[] = []
  private trunks: THREE.InstancedMesh[] = []
  private crowns: THREE.InstancedMesh[] = []

  constructor() {
    const rng = mulberry32(90210)
    const occupied: Array<[number, number]> = []

    const canPlaceLand = (x: number, z: number, minH: number, maxSlope: number, spacing: number): boolean => {
      const h = terrainHeight(x, z)
      if (h < minH) return false
      if (terrainSlope(x, z) > maxSlope) return false
      if (polylineDistance(x, z, PATH_PTS) < 1.2) return false
      if (polylineDistance(x, z, STREAM_PTS) < 1.1) return false
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius + 1.8) return false
      if (Math.hypot(x - CABIN_PAD.x, z - CABIN_PAD.z) < CABIN_PAD.radius + 1.2) return false
      if (Math.hypot(x - BRIDGE.center[0], z - BRIDGE.center[1]) < 2.3) return false
      for (const [ox, oz] of occupied) {
        if ((x - ox) * (x - ox) + (z - oz) * (z - oz) < spacing * spacing) return false
      }
      return true
    }

    // ---- 树木 ----
    const conifers: Placement[] = []
    const broadleaf: Placement[] = []
    let attempts = 0
    while ((conifers.length < 30 || broadleaf.length < 18) && attempts < 9000) {
      attempts++
      const x = rng() * 36.5 - 18.25
      const z = rng() * 36.5 - 18.25
      const y = terrainHeight(x, z)
      if (y < 1.35 || y > 6.7) continue
      if (!canPlaceLand(x, z, 1.35, 0.5, 2.7)) continue
      const preferConifer = y > 4.2 ? rng() < 0.86 : rng() < 0.32
      const target = preferConifer ? conifers : broadleaf
      if (target.length >= (preferConifer ? 30 : 18)) continue
      const maxScale = Math.min(1.15, (10.0 - y) / 4.3)
      if (maxScale < 0.4) continue
      const scale = Math.min(maxScale, 0.62 + rng() * 0.5)
      target.push({ x, z, y, scale, rot: rng() * Math.PI * 2 })
      occupied.push([x, z])
    }

    const trunkGeoConifer = new THREE.CylinderGeometry(0.11, 0.19, 1.9, 6)
    trunkGeoConifer.translate(0, 0.95, 0)
    const trunkGeoBroadleaf = new THREE.CylinderGeometry(0.1, 0.22, 2.1, 6)
    trunkGeoBroadleaf.translate(0, 1.05, 0)
    const crownGeoConifer = coniferCrown()
    const crownGeoBroadleaf = broadleafCrown()

    const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 0.95 })
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, flatShading: true })
    applySway(crownMat, { strength: 0.045, base: 1.6, speed: 0.85 })
    applySway(trunkMat, { strength: 0.008, base: 1.2, speed: 0.85 })
    this.materials.push(trunkMat, crownMat)
    this.geometries.push(trunkGeoConifer, trunkGeoBroadleaf, crownGeoConifer, crownGeoBroadleaf)

    const greenA = new THREE.Color(PALETTE.grass)
    const greenB = new THREE.Color(PALETTE.grassLight)
    const greenC = new THREE.Color(0x2f9c8a)
    const greenD = new THREE.Color(0x3fe0b0)

    const buildTreeSet = (list: Placement[], trunkGeo: THREE.BufferGeometry, crownGeo: THREE.BufferGeometry): void => {
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length)
      const crowns = new THREE.InstancedMesh(crownGeo, crownMat, list.length)
      const dummy = new THREE.Object3D()
      const color = new THREE.Color()
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y - 0.06, p.z)
        dummy.rotation.set(0, p.rot, 0)
        dummy.scale.set(p.scale, p.scale * (0.94 + ((i * 37) % 13) * 0.012), p.scale)
        dummy.updateMatrix()
        trunks.setMatrixAt(i, dummy.matrix)
        crowns.setMatrixAt(i, dummy.matrix)

        const t = (i * 0.618) % 1
        color.copy(greenA).lerp(greenB, t * 0.6)
        color.lerp(t > 0.55 ? greenD : greenC, 0.35)
        crowns.setColorAt(i, color)
      })
      trunks.castShadow = true
      trunks.receiveShadow = true
      crowns.castShadow = true
      crowns.receiveShadow = true
      trunks.instanceMatrix.needsUpdate = true
      crowns.instanceMatrix.needsUpdate = true
      if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true
      trunks.computeBoundingSphere()
      crowns.computeBoundingSphere()
      this.trunks.push(trunks)
      this.crowns.push(crowns)
      this.group.add(trunks, crowns)
    }

    buildTreeSet(conifers, trunkGeoConifer, crownGeoConifer)
    buildTreeSet(broadleaf, trunkGeoBroadleaf, crownGeoBroadleaf)

    // ---- 灌木 ----
    const bushGeo = new THREE.IcosahedronGeometry(0.55, 0)
    bushGeo.scale(1, 0.7, 1)
    bushGeo.translate(0, 0.35, 0)
    this.geometries.push(bushGeo)
    const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true })
    applySway(bushMat, { strength: 0.12, base: 0.15, speed: 1.1 })
    this.materials.push(bushMat)
    const bushes: Placement[] = []
    attempts = 0
    while (bushes.length < 46 && attempts < 6000) {
      attempts++
      const x = rng() * 37 - 18.5
      const z = rng() * 37 - 18.5
      const y = terrainHeight(x, z)
      if (y < 1.05 || y > 6.8) continue
      if (!canPlaceLand(x, z, 1.05, 0.6, 1.0)) continue
      bushes.push({ x, z, y, scale: 0.5 + rng() * 0.75, rot: rng() * Math.PI * 2 })
      occupied.push([x, z])
    }
    const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, bushes.length)
    const dummy = new THREE.Object3D()
    const bushColor = new THREE.Color()
    const bushBase = new THREE.Color(PALETTE.grassDeep)
    bushes.forEach((p, i) => {
      dummy.position.set(p.x, p.y - 0.04, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.set(p.scale * 1.2, p.scale, p.scale * 1.2)
      dummy.updateMatrix()
      bushMesh.setMatrixAt(i, dummy.matrix)
      bushColor.copy(bushBase).lerp(greenB, ((i * 0.37) % 1) * 0.7)
      bushMesh.setColorAt(i, bushColor)
    })
    bushMesh.castShadow = true
    bushMesh.receiveShadow = true
    bushMesh.instanceMatrix.needsUpdate = true
    if (bushMesh.instanceColor) bushMesh.instanceColor.needsUpdate = true
    bushMesh.computeBoundingSphere()
    this.group.add(bushMesh)

    // ---- 草丛 ----
    const tuftGeo = grassTuft()
    this.geometries.push(tuftGeo)
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      side: THREE.DoubleSide,
    })
    applySway(grassMat, { strength: 0.3, base: 0.0, speed: 1.35 })
    this.materials.push(grassMat)
    const grassCount = 720
    const grassMesh = new THREE.InstancedMesh(tuftGeo, grassMat, grassCount)
    const grassColors = new THREE.Color()
    let placed = 0
    attempts = 0
    while (placed < grassCount && attempts < 24000) {
      attempts++
      const x = rng() * 37.5 - 18.75
      const z = rng() * 37.5 - 18.75
      const y = terrainHeight(x, z)
      if (y < 1.1 || y > 8.2) continue
      if (terrainSlope(x, z) > 0.52) continue
      if (polylineDistance(x, z, PATH_PTS) < 0.9) continue
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius + 1.0) continue
      if (Math.hypot(x - CABIN_PAD.x, z - CABIN_PAD.z) < CABIN_PAD.radius) continue
      dummy.position.set(x, y - 0.03, z)
      dummy.rotation.set(0, rng() * Math.PI * 2, 0)
      const s = 0.65 + rng() * 0.9
      dummy.scale.set(s, s * (0.8 + rng() * 0.55), s)
      dummy.updateMatrix()
      grassMesh.setMatrixAt(placed, dummy.matrix)
      grassColors.copy(greenA).lerp(greenB, rng() * 0.75).lerp(greenC, rng() * 0.3)
      grassMesh.setColorAt(placed, grassColors)
      placed++
    }
    grassMesh.count = placed
    grassMesh.instanceMatrix.needsUpdate = true
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true
    grassMesh.computeBoundingSphere()
    this.group.add(grassMesh)

    // ---- 小花与幻想植物 ----
    const flowerGeo = new THREE.SphereGeometry(0.075, 6, 5)
    this.geometries.push(flowerGeo)
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    })
    this.materials.push(flowerMat)
    const flowerCount = 140
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount)
    const flowerColors = [
      new THREE.Color(PALETTE.warm),
      new THREE.Color(PALETTE.crystal),
      new THREE.Color(PALETTE.lavender),
      new THREE.Color(PALETTE.coral),
      new THREE.Color(0x9fe9ff),
    ]
    placed = 0
    attempts = 0
    while (placed < flowerCount && attempts < 12000) {
      attempts++
      const x = rng() * 37 - 18.5
      const z = rng() * 37 - 18.5
      const y = terrainHeight(x, z)
      if (y < 1.2 || y > 6.4) continue
      if (terrainSlope(x, z) > 0.42) continue
      if (polylineDistance(x, z, PATH_PTS) < 0.8) continue
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius + 0.8) continue
      dummy.position.set(x, y + 0.32 + rng() * 0.18, z)
      dummy.rotation.set(0, rng() * Math.PI * 2, 0)
      const s = 0.7 + rng() * 1.1
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      flowers.setMatrixAt(placed, dummy.matrix)
      flowers.setColorAt(placed, flowerColors[Math.floor(rng() * flowerColors.length)])
      placed++
    }
    flowers.count = placed
    flowers.instanceMatrix.needsUpdate = true
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true
    flowers.computeBoundingSphere()
    this.group.add(flowers)

    // ---- 陆地岩石 ----
    const rockGeo = new THREE.IcosahedronGeometry(0.7, 0)
    this.geometries.push(rockGeo)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.98,
      flatShading: true,
    })
    this.materials.push(rockMat)
    const rockCount = 46
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount)
    const rockBase = new THREE.Color(PALETTE.rock)
    const rockLight = new THREE.Color(PALETTE.rockLight)
    placed = 0
    attempts = 0
    while (placed < rockCount && attempts < 6000) {
      attempts++
      const x = rng() * 36 - 18
      const z = rng() * 36 - 18
      const y = terrainHeight(x, z)
      if (y < 0.6) continue
      if (polylineDistance(x, z, PATH_PTS) < 0.9) continue
      dummy.position.set(x, y + 0.1, z)
      dummy.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5)
      const s = 0.4 + rng() * 1.4
      dummy.scale.set(s, s * (0.5 + rng() * 0.4), s * (0.8 + rng() * 0.4))
      dummy.updateMatrix()
      rocks.setMatrixAt(placed, dummy.matrix)
      const c = rockBase.clone().lerp(rockLight, rng() * 0.6)
      rocks.setColorAt(placed, c)
      placed++
    }
    rocks.count = placed
    rocks.castShadow = true
    rocks.receiveShadow = true
    rocks.instanceMatrix.needsUpdate = true
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true
    rocks.computeBoundingSphere()
    this.group.add(rocks)
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.group.clear()
    this.trunks.length = 0
    this.crowns.length = 0
  }
}
