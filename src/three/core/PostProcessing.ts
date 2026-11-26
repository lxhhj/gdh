import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

export class PostProcessing {
  readonly composer: EffectComposer
  readonly bloom: UnrealBloomPass
  private width: number
  private height: number

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    this.width = width
    this.height = height
    this.composer = new EffectComposer(renderer)
    this.composer.setPixelRatio(1)
    this.composer.setSize(width, height)

    const renderPass = new RenderPass(scene, camera)
    this.composer.addPass(renderPass)

    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.26, 0.45, 0.98)
    this.composer.addPass(this.bloom)

    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }

  setSize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.composer.setSize(width, height)
    this.bloom.resolution.set(width, height)
  }

  setBloomStrength(strength: number): void {
    this.bloom.strength = strength
  }

  setRenderScale(scale: number): void {
    this.composer.setPixelRatio(scale)
    this.composer.setSize(this.width, this.height)
  }

  render(): void {
    this.composer.render()
  }

  dispose(): void {
    this.composer.dispose()
    this.bloom.dispose()
  }
}
