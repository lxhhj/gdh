import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { terrainHeight } from '../terrain/field'
import { mulberry32 } from '../core/Noise'

interface CrabState {
  group: THREE.Group
  base: THREE.Vector3
  phase: number
  radius: number
}

export class SeaLife {
  readonly group = new THREE.Group()
  private materials: THREE.Material[] = []
  private geometries: THREE.BufferGeometry[] = []
  private turtle = new THREE.Group()
  private turtleFl: THREE.Mesh | null = null
  private turtleFr: THREE.Mesh | null = null
  private turtleBl: THREE.Mesh | null = null
  private turtleBr: THREE.Mesh | null = null
  private crabs: CrabState[] = []
  private center = new THREE.Vector3(13.0, -1.55, 10.0)
  private turtleT = 0

  constructor() {
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x4f7a63, roughness: 0.62, metalness: 0.05 })
    const shellLight = new THREE.MeshStandardMaterial({ color: 0x7fa88f, roughness: 0.7 })
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8fb99b, roughness: 0.75 })
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0c161c, roughness: 0.2 })
    const crabMat = new THREE.MeshStandardMaterial({ color: 0xe8734f, roughness: 0.6 })
    this.materials.push(shellMat, shellLight, skinMat, eyeMat, crabMat)

    // ---------------- 海龟 ----------------
    const shellGeo = new THREE.SphereGeometry(0.62, 20, 14)
    shellGeo.scale(1.05, 0.42, 1.3)
    this.geometries.push(shellGeo)
    const shell = new THREE.Mesh(shellGeo, shellMat)
    shell.castShadow = true
    this.turtle.add(shell)

    const bellyGeo = new THREE.SphereGeometry(0.6, 18, 12)
    bellyGeo.scale(0.95, 0.18, 1.2)
    bellyGeo.translate(0, -0.14, 0)
    this.geometries.push(bellyGeo)
    const belly = new THREE.Mesh(bellyGeo, shellLight)
    this.turtle.add(belly)

    const headGeo = new THREE.SphereGeometry(0.25, 12, 10)
    headGeo.scale(1, 0.85, 1.25)
    headGeo.translate(0, 0.02, 0.95)
    this.geometries.push(headGeo)
    const head = new THREE.Mesh(headGeo, skinMat)
    this.turtle.add(head)

    const eyeGeo = new THREE.SphereGeometry(0.045, 6, 5)
    this.geometries.push(eyeGeo)
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(side * 0.13, 0.1, 1.1)
      this.turtle.add(eye)
    }

    const flipperGeo = new THREE.SphereGeometry(0.45, 12, 8)
    flipperGeo.scale(1.5, 0.14, 0.5)
    this.geometries.push(flipperGeo)
    const flippers: Array<[number, number, number, number]> = [
      [0.72, -0.02, 0.42, 0.55],
      [-0.72, -0.02, 0.42, 0.55],
      [0.58, -0.02, -0.58, -0.35],
      [-0.58, -0.02, -0.58, -0.35],
    ]
    const flipperMeshes: THREE.Mesh[] = []
    for (const [x, y, z, rot] of flippers) {
      const fin = new THREE.Mesh(flipperGeo, skinMat)
      fin.position.set(x, y, z)
      fin.rotation.y = rot
      this.turtle.add(fin)
      flipperMeshes.push(fin)
    }
    this.turtleFl = flipperMeshes[0]
    this.turtleFr = flipperMeshes[1]
    this.turtleBl = flipperMeshes[2]
    this.turtleBr = flipperMeshes[3]

    this.turtle.scale.setScalar(1.1)
    this.group.add(this.turtle)

    // ---------------- 螃蟹 ----------------
    const crabBody = new THREE.SphereGeometry(0.26, 10, 8)
    crabBody.scale(1.25, 0.6, 0.95)
    const parts: THREE.BufferGeometry[] = [crabBody]
    const legs: Array<[number, number, number]> = [
      [0.3, 0, 0.12],
      [0.34, 0, 0.24],
      [0.28, 0, 0.34],
      [-0.3, 0, 0.12],
      [-0.34, 0, 0.24],
      [-0.28, 0, 0.34],
    ]
    for (const [x, , z] of legs) {
      const leg = new THREE.BoxGeometry(0.05, 0.05, 0.24)
      leg.rotateY(x > 0 ? 0.5 : -0.5)
      leg.translate(x, -0.02, z)
      parts.push(leg)
    }
    for (const side of [-1, 1]) {
      const claw = new THREE.SphereGeometry(0.1, 8, 6)
      claw.scale(1.1, 0.7, 1.5)
      claw.translate(side * 0.26, 0.06, 0.36)
      parts.push(claw)
    }
    const crabGeo = mergeGeometries(parts)!
    parts.forEach((p) => p.dispose())
    this.geometries.push(crabGeo)

    const rng = mulberry32(6767)
    let made = 0
    let guard = 0
    while (made < 4 && guard < 300) {
      guard++
      const x = rng() * 26 - 13
      const z = rng() * 26 - 13
      const depth = -terrainHeight(x, z)
      if (depth < 0.8 || depth > 3.2) continue
      const crabGroup = new THREE.Group()
      const mesh = new THREE.Mesh(crabGeo, crabMat)
      mesh.castShadow = true
      crabGroup.add(mesh)
      const base = new THREE.Vector3(x, -depth + 0.18, z)
      crabGroup.position.copy(base)
      crabGroup.rotation.y = rng() * Math.PI * 2
      crabGroup.scale.setScalar(0.7 + rng() * 0.5)
      this.group.add(crabGroup)
      this.crabs.push({ group: crabGroup, base, phase: rng() * Math.PI * 2, radius: 0.35 + rng() * 0.35 })
      made++
    }
  }

  update(elapsed: number, dt: number): void {
    // 海龟环游
    this.turtleT += dt * 0.055
    const t = this.turtleT
    const r = 2.6
    const x = this.center.x + Math.cos(t) * r
    const z = this.center.z + Math.sin(t) * r * 0.75
    const y = this.center.y + Math.sin(t * 2.1) * 0.18
    const nextX = this.center.x + Math.cos(t + 0.02) * r
    const nextZ = this.center.z + Math.sin(t + 0.02) * r * 0.75
    this.turtle.position.set(x, y, z)
    this.turtle.lookAt(nextX, y, nextZ)
    this.turtle.rotation.z = Math.sin(elapsed * 0.5) * 0.08
    const flap = Math.sin(elapsed * 2.2) * 0.35
    if (this.turtleFl) this.turtleFl.rotation.z = flap
    if (this.turtleFr) this.turtleFr.rotation.z = -flap
    if (this.turtleBl) this.turtleBl.rotation.z = flap * 0.6
    if (this.turtleBr) this.turtleBr.rotation.z = -flap * 0.6

    // 螃蟹横向爬行
    for (const crab of this.crabs) {
      const a = elapsed * 0.18 + crab.phase
      crab.group.position.x = crab.base.x + Math.cos(a) * crab.radius
      crab.group.position.z = crab.base.z + Math.sin(a) * crab.radius * 0.6
      crab.group.position.y = crab.base.y + Math.abs(Math.sin(elapsed * 2.0 + crab.phase)) * 0.05
      crab.group.rotation.y = -a + Math.PI * 0.5
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.group.clear()
    this.crabs.length = 0
  }
}
