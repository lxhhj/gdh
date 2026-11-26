import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { SANDBOX, PALETTE } from '../config'
import { createJellyMaterial, type JellyMaterial } from '../materials/JellyMaterial'
import { damp } from '../core/math'

function roundedRectPoints(half: number, radius: number, y: number, segments = 14): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const inner = half - radius
  const corners: Array<[number, number, number]> = [
    [inner, inner, 0],
    [-inner, inner, Math.PI / 2],
    [-inner, -inner, Math.PI],
    [inner, -inner, (Math.PI * 3) / 2],
  ]
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= segments; i++) {
      const a = start + (i / segments) * (Math.PI / 2)
      pts.push(new THREE.Vector3(cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius))
    }
  }
  return pts
}

const glowVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColorB;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 p = abs(vUv * 2.0 - 1.0);
  float d = max(p.x, p.y);
  float halo = pow(smoothstep(1.0, 0.42, d), 2.4);
  float pulse = 0.82 + 0.18 * sin(uTime * 0.5 + p.x * 2.0);
  vec3 col = mix(uColor, uColorB, smoothstep(0.2, 0.95, p.y));
  gl_FragColor = vec4(col, halo * 0.12 * pulse);
}
`

export class Sandbox {
  readonly group = new THREE.Group()
  private shell: THREE.Mesh
  private shellMaterial: JellyMaterial
  private plateMaterials: JellyMaterial[] = []
  private lineMaterials: THREE.LineBasicMaterial[] = []
  private glowMaterial: THREE.ShaderMaterial
  private interiorAmount = 0
  private targetInterior = 0

  constructor(timeUniform: { value: number }) {
    // ---- 果冻外壳 ----
    const geometry = new RoundedBoxGeometry(
      SANDBOX.size,
      SANDBOX.height,
      SANDBOX.size,
      6,
      1.15,
    )
    this.shellMaterial = createJellyMaterial({ opacity: 1 })
    this.shellMaterial.uniforms.uTime = timeUniform
    this.shellMaterial.depthTest = true
    this.shellMaterial.side = THREE.BackSide
    this.shell = new THREE.Mesh(geometry, this.shellMaterial)
    this.shell.renderOrder = 60
    this.shell.raycast = () => {}
    this.shell.frustumCulled = false
    this.group.add(this.shell)

    // ---- 底部厚板 ----
    const plateConfigs: Array<{ size: number; height: number; y: number; opacity: number }> = [
      { size: 39.0, height: 0.32, y: -9.05, opacity: 0.5 },
      { size: 38.4, height: 0.42, y: -9.9, opacity: 0.65 },
      { size: 37.4, height: 0.3, y: -10.55, opacity: 0.4 },
    ]
    for (const cfg of plateConfigs) {
      const plate = new THREE.Mesh(
        new RoundedBoxGeometry(cfg.size, cfg.height, cfg.size, 2, 0.12),
        createJellyMaterial({ opacity: cfg.opacity }),
      )
      plate.position.y = cfg.y
      plate.renderOrder = 55
      plate.raycast = () => {}
      this.plateMaterials.push(plate.material as JellyMaterial)
      this.group.add(plate)
    }

    // ---- 荧光棱线 ----
    const lineMatTop = new THREE.LineBasicMaterial({
      color: 0xaef8ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
    this.lineMaterials.push(lineMatTop)

    const loops: Array<{ y: number; half: number; opacity: number }> = [
      { y: -10.52, half: 19.42, opacity: 0.24 },
    ]
    for (const loop of loops) {
      const geo = new THREE.BufferGeometry().setFromPoints(roundedRectPoints(loop.half, 2.85, loop.y))
      const mat = new THREE.LineBasicMaterial({
        color: 0x8deeff,
        transparent: true,
        opacity: loop.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
      this.lineMaterials.push(mat)
      const line = new THREE.LineLoop(geo, mat)
      line.renderOrder = 61
      line.raycast = () => {}
      this.group.add(line)
    }

    // ---- 底部悬浮光晕 ----
    this.glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(PALETTE.jellyRim) },
        uColorB: { value: new THREE.Color(PALETTE.jellyViolet) },
        uTime: timeUniform,
      },
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    })
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(74, 74), this.glowMaterial)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = -11.7
    glow.renderOrder = 1
    glow.raycast = () => {}
    this.group.add(glow)
  }

  /** 0 = 外部观察，1 = 进入水下的内部观察 */
  setInteriorTarget(value: number): void {
    this.targetInterior = value
  }

  update(dt: number): void {
    this.interiorAmount = damp(this.interiorAmount, this.targetInterior, 4, Math.max(dt, 0.0001))
    const shellOpacity = 1 - this.interiorAmount * 0.92
    this.shellMaterial.uniforms.uOpacity.value = shellOpacity
    for (const mat of this.plateMaterials) mat.uniforms.uOpacity.value = (1 - this.interiorAmount * 0.5) * 0.7
    for (const mat of this.lineMaterials) mat.opacity = (1 - this.interiorAmount * 0.55)
  }

  dispose(): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    })
    this.group.clear()
  }
}
