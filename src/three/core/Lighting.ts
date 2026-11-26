import * as THREE from 'three'
import { QUALITY } from '../config'

export class Lighting {
  readonly hemi: THREE.HemisphereLight
  readonly sun: THREE.DirectionalLight
  readonly rim: THREE.DirectionalLight
  readonly fill: THREE.PointLight
  private multiplier = 1

  private readonly base = {
    hemi: 0.58,
    sun: 1.45,
    rim: 0.3,
    fill: 7,
  }

  constructor(scene: THREE.Scene) {
    this.hemi = new THREE.HemisphereLight(0xbfeaff, 0x0a2a4a, this.base.hemi)
    scene.add(this.hemi)

    this.sun = new THREE.DirectionalLight(0xe8fbff, this.base.sun)
    this.sun.position.set(20, 36, 18)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(QUALITY.shadowMap, QUALITY.shadowMap)
    this.sun.shadow.camera.left = -24
    this.sun.shadow.camera.right = 24
    this.sun.shadow.camera.top = 24
    this.sun.shadow.camera.bottom = -24
    this.sun.shadow.camera.near = 2
    this.sun.shadow.camera.far = 100
    this.sun.shadow.bias = -0.0006
    this.sun.shadow.normalBias = 0.035
    this.sun.target.position.set(0, 0, 0)
    scene.add(this.sun)
    scene.add(this.sun.target)

    this.rim = new THREE.DirectionalLight(0xb48cff, this.base.rim)
    this.rim.position.set(-22, 14, -20)
    scene.add(this.rim)

    this.fill = new THREE.PointLight(0x66f2ff, this.base.fill, 36, 2)
    this.fill.position.set(9, -1.0, 9)
    scene.add(this.fill)
  }

  setIntensity(multiplier: number): void {
    this.multiplier = multiplier
    this.hemi.intensity = this.base.hemi * multiplier
    this.sun.intensity = this.base.sun * multiplier
    this.rim.intensity = this.base.rim * multiplier
    this.fill.intensity = this.base.fill * multiplier
  }

  getIntensity(): number {
    return this.multiplier
  }

  setUnderwater(value: boolean): void {
    this.fill.intensity = this.base.fill * this.multiplier * (value ? 1.6 : 1)
    this.sun.intensity = this.base.sun * this.multiplier * (value ? 0.72 : 1)
  }
}
