import * as THREE from 'three'
import { terrainHeight } from '../terrain/field'
import { createWaterMaterial, type WaterMaterial } from '../materials/WaterMaterial'
import { SANDBOX, PALETTE } from '../config'

const shaftVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const shaftFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
  float vertical = smoothstep(0.0, 0.7, vUv.y);
  float streak = 0.65 + 0.35 * sin(vUv.x * 18.0 + uTime * 0.45);
  gl_FragColor = vec4(uColor, edge * vertical * streak * uIntensity);
}
`

export class Ocean {
  readonly group = new THREE.Group()
  readonly material: WaterMaterial
  private mesh: THREE.Mesh
  private shafts: THREE.Mesh[] = []

  constructor(timeUniform: { value: number }) {
    const size = 39.85
    const segments = 120
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
    geometry.rotateX(-Math.PI / 2)

    const position = geometry.attributes.position as THREE.BufferAttribute
    const depths = new Float32Array(position.count)
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      depths[i] = Math.max(0, -terrainHeight(x, z))
    }
    geometry.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1))

    this.material = createWaterMaterial()
    this.material.uniforms.uTime = timeUniform

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.position.y = SANDBOX.waterY
    this.mesh.renderOrder = 10
    this.mesh.receiveShadow = false
    this.mesh.castShadow = false
    this.group.add(this.mesh)

    // ---- 水下体积光 ----
    const shaftMat = (intensity: number): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: timeUniform,
          uColor: { value: new THREE.Color(0x9fe9ff) },
          uIntensity: { value: intensity },
        },
        vertexShader: shaftVertex,
        fragmentShader: shaftFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      })

    const specs: Array<[number, number, number, number, number, number]> = [
      [6.5, 9.2, 0.35, 0.14, 0.0, 0.012],
      [11.8, 6.2, 0.22, 0.18, 1.1, 0.01],
      [9.0, 13.5, 0.5, 0.12, 2.2, 0.012],
      [14.5, 12.2, 0.3, 0.16, 3.4, 0.009],
      [3.8, 13.0, 0.5, 0.1, 4.6, 0.008],
    ]
    for (const [x, z, rotY, rotZ, phase, intensity] of specs) {
      const geo = new THREE.PlaneGeometry(5.5, 8.5, 1, 1)
      const shaft = new THREE.Mesh(geo, shaftMat(intensity))
      shaft.position.set(x, -3.9, z)
      shaft.rotation.set(0, rotY, rotZ)
      shaft.userData.phase = phase
      shaft.userData.baseZ = rotZ
      shaft.renderOrder = 12
      shaft.raycast = () => {}
      this.shafts.push(shaft)
      this.group.add(shaft)
    }
  }

  setOpacity(value: number): void {
    this.material.uniforms.uOpacity.value = value
  }

  get surface(): THREE.Mesh {
    return this.mesh
  }

  update(elapsed: number, camera?: THREE.Camera): void {
    for (const shaft of this.shafts) {
      const phase = shaft.userData.phase as number
      const baseZ = shaft.userData.baseZ as number
      shaft.rotation.z = baseZ + Math.sin(elapsed * 0.12 + phase) * 0.035
      // 让光柱始终朝向相机，避免侧视时变成一条硬线
      if (camera) {
        const dx = camera.position.x - shaft.position.x
        const dz = camera.position.z - shaft.position.z
        shaft.rotation.y = Math.atan2(dx, dz)
      }
    }
  }

  dispose(): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      mesh.geometry?.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    })
    this.group.clear()
  }
}
