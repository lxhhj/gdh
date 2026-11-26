import * as THREE from 'three'
import { PALETTE } from '../config'

const domeVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const domeFragment = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
varying vec3 vDir;

void main() {
  float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uBottom, uTop, pow(h, 1.25));
  float horizon = pow(1.0 - abs(vDir.y), 10.0);
  col += uGlow * horizon * 0.55;
  // 轻微色带，增加空间纵深
  col += vec3(0.01, 0.03, 0.05) * sin(vDir.x * 3.0 + vDir.z * 2.0) * 0.5;
  gl_FragColor = vec4(col, 1.0);
}
`

export class SceneManager {
  readonly scene = new THREE.Scene()
  private fogNormal = new THREE.FogExp2(0x05111f, 0.0055)
  private fogUnderwater = new THREE.FogExp2(0x062c45, 0.028)
  private dome: THREE.Mesh
  private stars: THREE.Points
  private underwater = false

  constructor() {
    this.scene.fog = this.fogNormal

    const domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(0x061a30) },
        uBottom: { value: new THREE.Color(PALETTE.bgDeep) },
        uGlow: { value: new THREE.Color(0x0d3550) },
      },
      vertexShader: domeVertex,
      fragmentShader: domeFragment,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(170, 40, 24), domeMat)
    this.dome.frustumCulled = false
    this.dome.renderOrder = -1000
    this.scene.add(this.dome)

    const starCount = 520
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 95 + Math.random() * 55
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(THREE.MathUtils.randFloat(-0.15, 1))
      starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      starPos[i * 3 + 1] = Math.cos(phi) * r
      starPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xbfeaff,
      size: 1.1,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
    this.stars = new THREE.Points(starGeo, starMat)
    this.stars.frustumCulled = false
    this.scene.add(this.stars)
  }

  setUnderwater(value: boolean): void {
    if (this.underwater === value) return
    this.underwater = value
    this.scene.fog = value ? this.fogUnderwater : this.fogNormal
  }

  isUnderwater(): boolean {
    return this.underwater
  }

  update(elapsed: number): void {
    this.stars.rotation.y = elapsed * 0.004
  }

  dispose(): void {
    this.dome.geometry.dispose()
    ;(this.dome.material as THREE.Material).dispose()
    this.stars.geometry.dispose()
    ;(this.stars.material as THREE.Material).dispose()
    this.scene.clear()
  }
}
