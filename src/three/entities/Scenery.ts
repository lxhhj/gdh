import * as THREE from 'three'
import { terrainHeight, LAKE, MOUNTAIN, CABIN_PAD } from '../terrain/field'
import { samplePolyline, PATH_PTS, STREAM_PTS, BOARDWALK, BRIDGE, CABIN_POS } from '../layout'
import { PALETTE } from '../config'

function makeRibbon(pts: [number, number][], width: number, lift: number): THREE.BufferGeometry {
  const samples = 150
  const verts: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const [x, z] = samplePolyline(pts, t)
    const [x2, z2] = samplePolyline(pts, Math.min(0.9999, t + 0.004))
    const [x1, z1] = samplePolyline(pts, Math.max(0, t - 0.004))
    let dx = x2 - x1
    let dz = z2 - z1
    const len = Math.hypot(dx, dz) || 1
    dx /= len
    dz /= len
    const nx = -dz
    const nz = dx
    const y = Math.max(
      terrainHeight(x, z),
      terrainHeight(x + nx * 0.35, z + nz * 0.35),
      terrainHeight(x - nx * 0.35, z - nz * 0.35),
    ) + lift
    verts.push(x + nx * width * 0.5, y, z + nz * width * 0.5)
    verts.push(x - nx * width * 0.5, y, z - nz * width * 0.5)
    uvs.push(t * 24, 0, t * 24, 1)
  }
  for (let i = 0; i < samples; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, c, b, b, c, d)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

const streamVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const streamFragment = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  float flow = sin(vUv.x * 110.0 - uTime * 2.8) * 0.5 + 0.5;
  float glint = pow(flow, 8.0);
  vec3 col = mix(vec3(0.03, 0.22, 0.3), vec3(0.18, 0.55, 0.62), 0.3 + flow * 0.3);
  col += vec3(0.25, 0.6, 0.7) * glint * 0.25;
  gl_FragColor = vec4(col, 0.5 + glint * 0.2);
}
`

const lakeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const lakeFragment = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float ripple = sin(r * 22.0 - uTime * 1.5 + p.x * 6.0 + sin(p.y * 9.0) * 1.5) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.03, 0.2, 0.29), vec3(0.12, 0.42, 0.5), 0.25 + ripple * 0.28);
  col += vec3(0.18, 0.5, 0.58) * pow(ripple, 10.0) * 0.22;
  float edge = smoothstep(1.0, 0.72, r);
  gl_FragColor = vec4(col, (0.55 * edge + 0.12) * smoothstep(1.02, 0.9, r));
}
`

export class Scenery {
  readonly group = new THREE.Group()
  private materials: THREE.Material[] = []
  private geometries: THREE.BufferGeometry[] = []
  private streamMat: THREE.ShaderMaterial | null = null
  private lakeMat: THREE.ShaderMaterial | null = null

  constructor(timeUniform: { value: number }) {
    const wood = new THREE.MeshStandardMaterial({ color: 0xa8794f, roughness: 0.88 })
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x7d5638, roughness: 0.92 })
    const wall = new THREE.MeshStandardMaterial({ color: 0xd9c49d, roughness: 0.92 })
    const roof = new THREE.MeshStandardMaterial({ color: 0x3f627c, roughness: 0.7, metalness: 0.05 })
    const stone = new THREE.MeshStandardMaterial({ color: 0x7c8b9a, roughness: 0.96, flatShading: true })
    const stoneDark = new THREE.MeshStandardMaterial({ color: 0x5e6c7b, roughness: 0.98, flatShading: true })
    const glowWarm = new THREE.MeshStandardMaterial({
      color: 0xffe2b0,
      emissive: 0xffc46b,
      emissiveIntensity: 1.2,
      roughness: 0.35,
    })
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xbff3ff,
      emissive: 0x4fc8e0,
      emissiveIntensity: 0.26,
      roughness: 0.15,
      metalness: 0.1,
      flatShading: true,
      transparent: true,
      opacity: 0.94,
    })
    this.materials.push(wood, woodDark, wall, roof, stone, stoneDark, glowWarm, crystalMat)

    const addBox = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      cast = true,
    ): THREE.Mesh => {
      const geo = new THREE.BoxGeometry(w, h, d)
      this.geometries.push(geo)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      mesh.castShadow = cast
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }

    // ---------------- 小路 ----------------
    const pathGeo = makeRibbon(PATH_PTS, 0.78, 0.055)
    this.geometries.push(pathGeo)
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xc9b489,
      roughness: 1,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    this.materials.push(pathMat)
    const pathMesh = new THREE.Mesh(pathGeo, pathMat)
    pathMesh.receiveShadow = true
    this.group.add(pathMesh)

    // ---------------- 溪流 ----------------
    const streamPoints: THREE.Vector3[] = []
    for (let i = 0; i <= 90; i++) {
      const [x, z] = samplePolyline(STREAM_PTS, i / 90)
      streamPoints.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.1, z))
    }
    const streamCurve = new THREE.CatmullRomCurve3(streamPoints)
    const streamGeo = new THREE.TubeGeometry(streamCurve, 130, 0.2, 5, false)
    this.geometries.push(streamGeo)
    this.streamMat = new THREE.ShaderMaterial({
      uniforms: { uTime: timeUniform },
      vertexShader: streamVertex,
      fragmentShader: streamFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.materials.push(this.streamMat)
    const streamMesh = new THREE.Mesh(streamGeo, this.streamMat)
    streamMesh.renderOrder = 9
    streamMesh.raycast = () => {}
    this.group.add(streamMesh)

    // ---------------- 山脚湖泊 ----------------
    const lakeGeo = new THREE.CircleGeometry(LAKE.radius, 64)
    lakeGeo.rotateX(-Math.PI / 2)
    this.geometries.push(lakeGeo)
    this.lakeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: timeUniform },
      vertexShader: lakeVertex,
      fragmentShader: lakeFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.materials.push(this.lakeMat)
    const lakeMesh = new THREE.Mesh(lakeGeo, this.lakeMat)
    lakeMesh.position.set(LAKE.x, LAKE.level + 0.02, LAKE.z)
    lakeMesh.renderOrder = 8
    lakeMesh.raycast = () => {}
    this.group.add(lakeMesh)

    const lakeStoneGeo = new THREE.IcosahedronGeometry(0.45, 0)
    this.geometries.push(lakeStoneGeo)
    const lakeStones = new THREE.InstancedMesh(lakeStoneGeo, stoneDark, 18)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      const r = LAKE.radius + 0.55 + (i % 3) * 0.16
      const x = LAKE.x + Math.cos(a) * r
      const z = LAKE.z + Math.sin(a) * r
      dummy.position.set(x, terrainHeight(x, z) + 0.14, z)
      dummy.rotation.set(i * 0.4, a, i * 0.2)
      const s = 0.7 + ((i * 37) % 10) * 0.07
      dummy.scale.set(s, s * 0.6, s)
      dummy.updateMatrix()
      lakeStones.setMatrixAt(i, dummy.matrix)
    }
    lakeStones.castShadow = true
    lakeStones.instanceMatrix.needsUpdate = true
    lakeStones.computeBoundingSphere()
    this.group.add(lakeStones)

    // ---------------- 小木屋 ----------------
    const cabin = new THREE.Group()
    const cabinY = CABIN_PAD.height
    cabin.position.set(CABIN_POS[0], cabinY, CABIN_POS[1])
    cabin.rotation.y = Math.PI / 4
    addBox(cabin, 2.9, 0.45, 2.5, stoneDark, 0, 0.22, 0)
    addBox(cabin, 2.4, 1.45, 2.0, wall, 0, 1.15, 0)
    addBox(cabin, 2.6, 0.12, 2.2, woodDark, 0, 1.9, 0)
    const roofGeo = new THREE.ConeGeometry(2.05, 1.15, 4)
    roofGeo.rotateY(Math.PI / 4)
    this.geometries.push(roofGeo)
    const roofMesh = new THREE.Mesh(roofGeo, roof)
    roofMesh.position.y = 2.5
    roofMesh.castShadow = true
    roofMesh.receiveShadow = true
    cabin.add(roofMesh)
    addBox(cabin, 0.52, 1.0, 0.08, woodDark, 0, 0.95, 1.02)
    addBox(cabin, 0.55, 0.42, 0.06, glowWarm, 0.68, 1.32, 1.03, false)
    addBox(cabin, 0.55, 0.42, 0.06, glowWarm, -0.68, 1.32, 1.03, false)
    addBox(cabin, 0.32, 0.95, 0.32, stone, -0.72, 2.4, -0.45)
    addBox(cabin, 2.7, 0.1, 0.85, wood, 0, 0.42, 1.34)
    const cabinLight = new THREE.PointLight(0xffc46b, 5, 8, 2)
    cabinLight.position.set(0.9, 1.55, 1.35)
    cabin.add(cabinLight)
    this.group.add(cabin)

    // ---------------- 木质栈道 + 观景台 ----------------
    const start = BOARDWALK.start
    const end = BOARDWALK.end
    const dx = end[0] - start[0]
    const dz = end[1] - start[1]
    const length = Math.hypot(dx, dz)
    const dirX = dx / length
    const dirZ = dz / length
    const deckY = BOARDWALK.deckY
    const angle = Math.atan2(dirX, dirZ)

    const plankGeo = new THREE.BoxGeometry(BOARDWALK.width, 0.1, 0.36)
    this.geometries.push(plankGeo)
    const plankCount = 16
    const planks = new THREE.InstancedMesh(plankGeo, wood, plankCount)
    for (let i = 0; i < plankCount; i++) {
      const t = (i + 0.5) / plankCount
      dummy.position.set(start[0] + dx * t, deckY + Math.sin(t * Math.PI) * 0.06, start[1] + dz * t)
      dummy.rotation.set(0, angle, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      planks.setMatrixAt(i, dummy.matrix)
    }
    planks.castShadow = true
    planks.receiveShadow = true
    planks.instanceMatrix.needsUpdate = true
    planks.computeBoundingSphere()
    this.group.add(planks)

    const postGeo = new THREE.CylinderGeometry(0.075, 0.09, 1, 6)
    postGeo.translate(0, 0.5, 0)
    this.geometries.push(postGeo)
    const postMat = woodDark
    const postCount = 6
    const posts = new THREE.InstancedMesh(postGeo, postMat, postCount)
    for (let i = 0; i < postCount; i++) {
      const t = (i + 0.5) / postCount
      const x = start[0] + dx * t
      const z = start[1] + dz * t
      const bottom = terrainHeight(x, z) - 0.2
      dummy.position.set(x, bottom, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, deckY - bottom, 1)
      dummy.updateMatrix()
      posts.setMatrixAt(i, dummy.matrix)
    }
    posts.castShadow = true
    posts.instanceMatrix.needsUpdate = true
    posts.computeBoundingSphere()
    this.group.add(posts)

    // 栏杆
    const railOffset = BOARDWALK.width * 0.5 - 0.06
    for (const side of [-1, 1]) {
      const ox = -dirZ * railOffset * side
      const oz = dirX * railOffset * side
      const railGeo = new THREE.BoxGeometry(0.06, 0.07, length * 0.92)
      this.geometries.push(railGeo)
      const rail = new THREE.Mesh(railGeo, woodDark)
      rail.position.set((start[0] + end[0]) / 2 + ox, deckY + 0.62, (start[1] + end[1]) / 2 + oz)
      rail.rotation.y = angle
      rail.castShadow = true
      this.group.add(rail)
      for (const t of [0.08, 0.36, 0.64, 0.92]) {
        const px = start[0] + dx * t + ox
        const pz = start[1] + dz * t + oz
        addBox(this.group, 0.07, 0.62, 0.07, woodDark, px, deckY + 0.32, pz)
      }
    }

    // 观景台（圆台）
    const deckGeo = new THREE.CylinderGeometry(1.85, 1.95, 0.16, 20)
    this.geometries.push(deckGeo)
    const deck = new THREE.Mesh(deckGeo, wood)
    deck.position.set(end[0], deckY + 0.14, end[1])
    deck.castShadow = true
    deck.receiveShadow = true
    this.group.add(deck)

    const deckPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 1, 6)
    deckPostGeo.translate(0, 0.5, 0)
    this.geometries.push(deckPostGeo)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const x = end[0] + Math.cos(a) * 1.5
      const z = end[1] + Math.sin(a) * 1.5
      const bottom = terrainHeight(x, z) - 0.25
      const post = new THREE.Mesh(deckPostGeo, postMat)
      post.position.set(x, bottom, z)
      post.scale.y = deckY - bottom
      post.castShadow = true
      this.group.add(post)
    }

    // 环形护栏
    const railingGeo = new THREE.TorusGeometry(1.78, 0.035, 4, 40)
    railingGeo.rotateX(Math.PI / 2)
    this.geometries.push(railingGeo)
    const railing = new THREE.Mesh(railingGeo, woodDark)
    railing.position.set(end[0], deckY + 0.92, end[1])
    this.group.add(railing)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const x = end[0] + Math.cos(a) * 1.78
      const z = end[1] + Math.sin(a) * 1.78
      addBox(this.group, 0.06, 0.9, 0.06, woodDark, x, deckY + 0.55, z)
    }

    // ---------------- 石桥 ----------------
    const [bx, bz] = BRIDGE.center
    const bridgeBase = terrainHeight(bx, bz)

    // 找到小路与石桥交点处的切向，作为过桥方向
    let bestT = 0
    let bestD = Infinity
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      const [px, pz] = samplePolyline(PATH_PTS, t)
      const d = Math.hypot(px - bx, pz - bz)
      if (d < bestD) {
        bestD = d
        bestT = t
      }
    }
    const [p1x, p1z] = samplePolyline(PATH_PTS, Math.max(0, bestT - 0.01))
    const [p2x, p2z] = samplePolyline(PATH_PTS, Math.min(0.999, bestT + 0.01))
    let wx = p2x - p1x
    let wz = p2z - p1z
    const wlen = Math.hypot(wx, wz) || 1
    wx /= wlen
    wz /= wlen
    const nx = -wz
    const nz = wx
    const bridgeAngle = Math.atan2(-nz, nx)

    const bridgePlankGeo = new THREE.BoxGeometry(BRIDGE.width, 0.12, 0.34)
    this.geometries.push(bridgePlankGeo)
    const bridgePlanks = new THREE.InstancedMesh(bridgePlankGeo, stone, 9)
    for (let i = 0; i < 9; i++) {
      const off = (i - 4) * 0.33
      const arch = Math.cos((i / 4 - 1) * (Math.PI / 2)) * 0.34
      dummy.position.set(bx + wx * off, bridgeBase + 0.3 + arch, bz + wz * off)
      dummy.rotation.set(0, bridgeAngle, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      bridgePlanks.setMatrixAt(i, dummy.matrix)
    }
    bridgePlanks.castShadow = true
    bridgePlanks.receiveShadow = true
    bridgePlanks.instanceMatrix.needsUpdate = true
    bridgePlanks.computeBoundingSphere()
    this.group.add(bridgePlanks)

    // 石墩
    for (const side of [-1, 1]) {
      const px = bx + wx * side * 1.35
      const pz = bz + wz * side * 1.35
      addBox(this.group, 0.95, 0.6, 1.0, stoneDark, px, terrainHeight(px, pz) + 0.18, pz)
    }

    // 栏杆
    const bridgeRailGeo = new THREE.BoxGeometry(0.07, 0.07, 2.9)
    this.geometries.push(bridgeRailGeo)
    for (const side of [-1, 1]) {
      const px = bx + nx * side * (BRIDGE.width / 2 - 0.08)
      const pz = bz + nz * side * (BRIDGE.width / 2 - 0.08)
      const rail = new THREE.Mesh(bridgeRailGeo, stoneDark)
      rail.position.set(px, bridgeBase + 1.05, pz)
      rail.rotation.y = Math.atan2(wx, wz)
      rail.castShadow = true
      this.group.add(rail)
      for (const end of [-1, 1]) {
        addBox(
          this.group,
          0.08,
          0.95,
          0.08,
          stoneDark,
          px + wx * end * 1.25,
          bridgeBase + 0.72,
          pz + wz * end * 1.25,
        )
      }
    }

    // ---------------- 山峰晶体 ----------------
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0)
    this.geometries.push(crystalGeo)
    const crystalCount = 16
    const crystals = new THREE.InstancedMesh(crystalGeo, crystalMat, crystalCount)
    for (let i = 0; i < crystalCount; i++) {
      const a = (i / crystalCount) * Math.PI * 2
      const r = 0.5 + ((i * 53) % 100) / 100 * 3.4
      const x = MOUNTAIN.x + Math.cos(a) * r
      const z = MOUNTAIN.z + Math.sin(a) * r
      const y = terrainHeight(x, z)
      dummy.position.set(x, y + 0.25, z)
      dummy.rotation.set(((i * 17) % 10) * 0.05, a, ((i * 29) % 10) * 0.04)
      const s = 0.42 + ((i * 41) % 100) / 100 * 0.95
      dummy.scale.set(s, s * (1.2 + ((i * 11) % 10) * 0.1), s)
      dummy.updateMatrix()
      crystals.setMatrixAt(i, dummy.matrix)
    }
    crystals.castShadow = false
    crystals.instanceMatrix.needsUpdate = true
    crystals.computeBoundingSphere()
    this.group.add(crystals)

    const peakLight = new THREE.PointLight(0x8feaff, 1.3, 12, 2)
    peakLight.position.set(MOUNTAIN.x, terrainHeight(MOUNTAIN.x, MOUNTAIN.z) + 1.6, MOUNTAIN.z)
    this.group.add(peakLight)

    // ---------------- 路边灯笼 ----------------
    for (const t of [0.34, 0.68]) {
      const [x, z] = samplePolyline(PATH_PTS, t)
      const [x2, z2] = samplePolyline(PATH_PTS, Math.min(0.999, t + 0.01))
      const [x1, z1] = samplePolyline(PATH_PTS, Math.max(0, t - 0.01))
      let dx = x2 - x1
      let dz = z2 - z1
      const len = Math.hypot(dx, dz) || 1
      dx /= len
      dz /= len
      const px = x - dz * 1.2
      const pz = z + dx * 1.2
      const py = terrainHeight(px, pz)
      const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, 1.35, 5)
      this.geometries.push(poleGeo)
      const pole = new THREE.Mesh(poleGeo, woodDark)
      pole.position.set(px, py + 0.65, pz)
      pole.castShadow = true
      this.group.add(pole)
      const lanternGeo = new THREE.SphereGeometry(0.13, 8, 6)
      this.geometries.push(lanternGeo)
      const lantern = new THREE.Mesh(lanternGeo, glowWarm)
      lantern.position.set(px, py + 1.4, pz)
      this.group.add(lantern)
      const light = new THREE.PointLight(0xffd08a, 2.5, 6, 2)
      light.position.set(px, py + 1.45, pz)
      this.group.add(light)
    }
  }

  update(elapsed: number): void {
    if (this.streamMat) this.streamMat.uniforms.uTime.value = elapsed
    if (this.lakeMat) this.lakeMat.uniforms.uTime.value = elapsed
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.group.clear()
  }
}
