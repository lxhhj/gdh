import * as THREE from 'three'
import { timeUniform } from '../core/time'
import { smoothstep } from '../core/math'

export class Whale {
  readonly group = new THREE.Group()
  private model = new THREE.Group()
  private tailPivot = new THREE.Group()
  private path: THREE.CatmullRomCurve3
  private duration = 62
  private t = 0.05
  private materials: THREE.Material[] = []
  private geometries: THREE.BufferGeometry[] = []
  readonly pickables: THREE.Object3D[] = []

  constructor() {
    this.path = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(5.0, -2.7, 7.0),
        new THREE.Vector3(11.5, -2.85, 4.5),
        new THREE.Vector3(15.5, -3.0, 8.5),
        new THREE.Vector3(14.5, -2.75, 14.5),
        new THREE.Vector3(8.5, -2.6, 16.8),
        new THREE.Vector3(2.8, -3.0, 13.5),
        new THREE.Vector3(2.2, -3.2, 9.0),
      ],
      true,
      'catmullrom',
      0.5,
    )

    // ---------------- 身体 ----------------
    const bodyGeo = new THREE.SphereGeometry(1, 46, 32)
    const pos = bodyGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      // 尾部收窄
      const taper = 0.16 + 0.84 * smoothstep(-1.0, 0.15, z)
      const headRound = 1 - 0.16 * smoothstep(0.55, 1.0, z)
      pos.setXYZ(i, x * 0.98 * taper * headRound, y * 0.84 * taper * headRound - 0.03, z * 3.4)
    }
    pos.needsUpdate = true
    bodyGeo.computeVertexNormals()

    const count = pos.count
    const colors = new Float32Array(count * 3)
    const belly = new THREE.Color(0xa8c7d2)
    const back = new THREE.Color(0x3d6f96)
    const mixColor = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const bellyT = smoothstep(-0.6, 0.25, y)
      mixColor.copy(belly).lerp(back, bellyT)
      // 头部略深
      mixColor.lerp(back, smoothstep(2.4, 3.4, z) * 0.25)
      colors[i * 3] = mixColor.r
      colors[i * 3 + 1] = mixColor.g
      colors[i * 3 + 2] = mixColor.b
    }
    bodyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometries.push(bodyGeo)

    const bodyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.08,
      emissive: 0x0a2338,
      emissiveIntensity: 0.55,
    })
    bodyMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = timeUniform
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float whaleAmp = 1.0 - smoothstep(-3.3, 0.5, transformed.z);
          transformed.y += sin(uTime * 1.3 + transformed.z * 0.95) * 0.16 * whaleAmp;
          transformed.x += sin(uTime * 0.65 + transformed.z * 0.35) * 0.06 * whaleAmp;`,
        )
    }
    bodyMat.customProgramCacheKey = () => 'whale-body'
    this.materials.push(bodyMat)

    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.castShadow = true
    body.receiveShadow = true
    body.userData.species = 'whale'
    this.model.add(body)
    this.pickables.push(body)

    const finMat = new THREE.MeshStandardMaterial({ color: 0x2a4a66, roughness: 0.5, metalness: 0.05 })
    this.materials.push(finMat)

    // ---------------- 尾鳍 ----------------
    const tailShape = new THREE.Shape()
    tailShape.moveTo(0, 0)
    tailShape.lineTo(1.55, 1.42)
    tailShape.lineTo(1.2, 1.66)
    tailShape.quadraticCurveTo(0.68, 1.36, 0, 1.02)
    tailShape.quadraticCurveTo(-0.68, 1.36, -1.2, 1.66)
    tailShape.lineTo(-1.55, 1.42)
    tailShape.closePath()
    const tailGeo = new THREE.ExtrudeGeometry(tailShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.03,
      bevelSegments: 2,
    })
    tailGeo.rotateX(-Math.PI / 2)
    tailGeo.scale(0.82, 1, 0.82)
    this.geometries.push(tailGeo)
    const tail = new THREE.Mesh(tailGeo, finMat)
    tail.position.set(0, 0, 0)
    tail.castShadow = true
    tail.userData.species = 'whale'
    this.tailPivot.position.set(0, 0, -3.0)
    this.tailPivot.add(tail)
    this.model.add(this.tailPivot)
    this.pickables.push(tail)

    // ---------------- 胸鳍 ----------------
    const finGeo = new THREE.SphereGeometry(0.62, 14, 10)
    finGeo.scale(1.65, 0.13, 0.6)
    this.geometries.push(finGeo)
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(finGeo, finMat)
      fin.position.set(side * 0.82, -0.3, 1.05)
      fin.rotation.set(0.1, side * -0.28, side * 0.34)
      fin.scale.setScalar(0.86)
      fin.castShadow = true
      fin.userData.species = 'whale'
      this.model.add(fin)
      this.pickables.push(fin)
    }

    // ---------------- 背鳍 ----------------
    const dorsalGeo = new THREE.ConeGeometry(0.3, 0.55, 4)
    dorsalGeo.rotateX(-0.35)
    this.geometries.push(dorsalGeo)
    const dorsal = new THREE.Mesh(dorsalGeo, finMat)
    dorsal.position.set(0, 0.72, -0.6)
    dorsal.scale.set(0.55, 1, 1.4)
    dorsal.userData.species = 'whale'
    this.model.add(dorsal)
    this.pickables.push(dorsal)

    // ---------------- 眼睛 ----------------
    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 6)
    this.geometries.push(eyeGeo)
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0b1620, roughness: 0.2 })
    this.materials.push(eyeMat)
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(side * 0.54, 0.02, 2.72)
      this.model.add(eye)
    }

    this.group.add(this.model)
    this.group.scale.setScalar(1.0)
  }

  update(dt: number, elapsed: number): void {
    this.t = (this.t + dt / this.duration) % 1
    const p = this.path.getPointAt(this.t)
    const next = this.path.getPointAt((this.t + 0.0025) % 1)
    this.group.position.set(p.x, p.y + Math.sin(elapsed * 0.45) * 0.12, p.z)
    this.group.lookAt(next)
    this.model.rotation.z = Math.sin(elapsed * 0.33) * 0.05
    this.tailPivot.rotation.x = Math.sin(elapsed * 1.55) * 0.34
    this.model.position.y = Math.sin(elapsed * 1.55 + 0.6) * 0.03
  }

  /** 用于点击聚焦的鲸鱼当前位置 */
  get position(): THREE.Vector3 {
    return this.group.position
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.group.clear()
    this.pickables.length = 0
  }
}
