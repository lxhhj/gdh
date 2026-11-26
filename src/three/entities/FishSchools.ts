import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../core/Noise'
import { timeUniform } from '../core/time'

const vertexShader = /* glsl */ `
uniform float uTime;
attribute vec3 aCenter;
attribute vec2 aOrbit;
attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
attribute float aDepthPhase;
attribute vec3 aFishColor;

varying vec3 vColor;
varying float vShade;

void main() {
  float ang = aPhase + uTime * aSpeed;
  vec3 offset = vec3(
    cos(ang) * aOrbit.x,
    sin(ang * 1.7 + aDepthPhase) * 0.5,
    sin(ang) * aOrbit.y
  );

  vec3 dir = normalize(vec3(
    -sin(ang) * aOrbit.x,
    cos(ang * 1.7 + aDepthPhase) * 0.22,
    cos(ang) * aOrbit.y
  ));
  float yaw = atan(dir.x, dir.z);
  float cy = cos(yaw);
  float sy = sin(yaw);

  vec3 p = position;
  float tailWeight = 1.0 - smoothstep(-1.1, -0.35, p.z);
  p.x += sin(uTime * 7.0 + aPhase * 11.0 - p.z * 4.0) * 0.12 * tailWeight;

  vec3 rp = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  rp *= aSize;

  vec3 world = aCenter + offset + rp;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;

  vShade = 0.55 + 0.45 * smoothstep(-0.5, 0.5, p.y);
  vColor = aFishColor;
}
`

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vShade;

void main() {
  vec3 col = vColor * (0.42 + vShade * 0.5);
  col += vColor * 0.05;
  gl_FragColor = vec4(col, 1.0);
}
`

function makeFishGeometry(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(0.5, 10, 8)
  body.scale(0.38, 0.5, 1.0)

  const tail = new THREE.ConeGeometry(0.34, 0.5, 4, 1)
  tail.rotateX(-Math.PI / 2)
  tail.translate(0, 0, -0.72)
  tail.scale(1, 0.16, 1)

  return mergeGeometries([body, tail])!
}

interface SchoolSpec {
  center: [number, number, number]
  rx: number
  rz: number
  speed: number
  count: number
  colors: number[]
}

export class FishSchools {
  readonly group = new THREE.Group()
  private geometry: THREE.InstancedBufferGeometry
  private material: THREE.ShaderMaterial
  readonly count: number

  constructor() {
    const schools: SchoolSpec[] = [
      { center: [8.2, -3.0, 10.4], rx: 3.3, rz: 2.6, speed: 0.33, count: 30, colors: [0x2fd8ef, 0x3fe0c0, 0x1fa8c8] },
      { center: [13.2, -3.3, 13.4], rx: 2.3, rz: 2.0, speed: 0.47, count: 26, colors: [0xa77bff, 0x8c5cf0, 0xff6fae] },
      { center: [6.2, -2.1, 7.0], rx: 2.0, rz: 1.7, speed: 0.6, count: 22, colors: [0xff9a3c, 0xffb84d, 0x3fe0c0] },
    ]

    const total = schools.reduce((n, s) => n + s.count, 0)
    this.count = total
    const rng = mulberry32(20261126)

    const centers = new Float32Array(total * 3)
    const orbits = new Float32Array(total * 2)
    const phases = new Float32Array(total)
    const speeds = new Float32Array(total)
    const sizes = new Float32Array(total)
    const depthPhases = new Float32Array(total)
    const colors = new Float32Array(total * 3)
    const tmpColor = new THREE.Color()

    let index = 0
    for (const school of schools) {
      const sign = rng() < 0.5 ? -1 : 1
      for (let i = 0; i < school.count; i++) {
        centers[index * 3] = school.center[0] + (rng() - 0.5) * 1.4
        centers[index * 3 + 1] = school.center[1] + (rng() - 0.5) * 0.6
        centers[index * 3 + 2] = school.center[2] + (rng() - 0.5) * 1.4
        orbits[index * 2] = school.rx * (0.72 + rng() * 0.55)
        orbits[index * 2 + 1] = school.rz * (0.72 + rng() * 0.55)
        phases[index] = rng() * Math.PI * 2
        speeds[index] = school.speed * (0.85 + rng() * 0.3) * sign
        sizes[index] = 0.34 + rng() * 0.3
        depthPhases[index] = rng() * Math.PI * 2
        tmpColor.setHex(school.colors[Math.floor(rng() * school.colors.length)])
        colors[index * 3] = tmpColor.r
        colors[index * 3 + 1] = tmpColor.g
        colors[index * 3 + 2] = tmpColor.b
        index++
      }
    }

    const base = makeFishGeometry()
    this.geometry = new THREE.InstancedBufferGeometry()
    this.geometry.index = base.index
    this.geometry.setAttribute('position', base.getAttribute('position'))
    this.geometry.setAttribute('normal', base.getAttribute('normal'))
    this.geometry.setAttribute('uv', base.getAttribute('uv'))
    this.geometry.instanceCount = total
    this.geometry.setAttribute('aCenter', new THREE.InstancedBufferAttribute(centers, 3))
    this.geometry.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(orbits, 2))
    this.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
    this.geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1))
    this.geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 1))
    this.geometry.setAttribute('aDepthPhase', new THREE.InstancedBufferAttribute(depthPhases, 1))
    this.geometry.setAttribute('aFishColor', new THREE.InstancedBufferAttribute(colors, 3))
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -3, 0), 30)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: timeUniform,
      },
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
    })

    const mesh = new THREE.Mesh(this.geometry, this.material)
    mesh.frustumCulled = false
    mesh.castShadow = false
    mesh.raycast = () => {}
    this.group.add(mesh)

    base.dispose()
  }

  get total(): number {
    return this.count
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.group.clear()
  }
}
