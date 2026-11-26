import * as THREE from 'three'
import { timeUniform } from './core/time'
import { Ticker } from './core/Ticker'
import { Engine } from './core/Engine'
import { SceneManager } from './core/SceneManager'
import { CameraManager } from './core/CameraManager'
import { Lighting } from './core/Lighting'
import { PostProcessing } from './core/PostProcessing'
import { Sandbox } from './entities/Sandbox'
import { Terrain } from './entities/Terrain'
import { Ocean } from './entities/Ocean'
import { Forest } from './entities/Forest'
import { Scenery } from './entities/Scenery'
import { Seaweed } from './entities/Seaweed'
import { SeaLife } from './entities/SeaLife'
import { Whale } from './entities/Whale'
import { FishSchools } from './entities/FishSchools'
import { Jellyfish } from './entities/Jellyfish'
import { Particles } from './entities/Particles'
import { Interaction } from './interaction/Interaction'
import type { SpeciesId, ViewKey } from './config'

export interface SceneStats {
  fps: number
  particles: number
  creatures: number
  fish: number
  jellies: number
  view: ViewKey
  underwater: boolean
}

export interface JellySeaCallbacks {
  onReady?: () => void
  onProgress?: (progress: number, label: string) => void
  onFps?: (fps: number) => void
  onStats?: (stats: SceneStats) => void
  onViewChange?: (view: ViewKey) => void
  onSpeciesSelect?: (id: SpeciesId) => void
}

export class JellySeaApp {
  private canvas: HTMLCanvasElement
  private callbacks: JellySeaCallbacks
  private ticker = new Ticker()
  private engine: Engine
  private sceneManager: SceneManager
  private cameraManager: CameraManager
  private lighting: Lighting
  private post: PostProcessing

  private sandbox!: Sandbox
  private terrain!: Terrain
  private ocean!: Ocean
  private forest!: Forest
  private scenery!: Scenery
  private seaweed!: Seaweed
  private seaLife!: SeaLife
  private whale!: Whale
  private fish!: FishSchools
  private jellyfish!: Jellyfish
  private particles!: Particles
  private interaction!: Interaction

  private underwater = false
  private statsTimer = 0
  private disposed = false

  constructor(canvas: HTMLCanvasElement, callbacks: JellySeaCallbacks = {}) {
    this.canvas = canvas
    this.callbacks = callbacks

    this.sceneManager = new SceneManager()
    this.cameraManager = new CameraManager(canvas)
    this.cameraManager.onViewChange = (view) => this.callbacks.onViewChange?.(view)
    this.lighting = new Lighting(this.sceneManager.scene)

    this.engine = new Engine(canvas, this.ticker, {
      onFps: (fps) => {
        this.callbacks.onFps?.(fps)
        this.emitStats()
      },
    })

    const width = this.width()
    const height = this.height()
    this.engine.setSize(width, height)
    this.cameraManager.resize(width, height)
    this.post = new PostProcessing(this.engine.renderer, this.sceneManager.scene, this.cameraManager.camera, width, height)

    this.engine.setUpdate((dt, elapsed) => this.tick(dt, elapsed))
    window.addEventListener('resize', this.onResize)
  }

  private width(): number {
    return Math.max(1, this.canvas.clientWidth || window.innerWidth)
  }

  private height(): number {
    return Math.max(1, this.canvas.clientHeight || window.innerHeight)
  }

  async init(): Promise<void> {
    const step = async (progress: number, label: string): Promise<void> => {
      this.callbacks.onProgress?.(progress, label)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }

    await step(0.06, '浇筑正方形果冻外壳')
    this.sandbox = new Sandbox(timeUniform)
    this.sceneManager.scene.add(this.sandbox.group)

    await step(0.18, '隆起山脉、海岸与海床')
    this.terrain = new Terrain()
    this.sceneManager.scene.add(this.terrain.mesh)

    await step(0.32, '注入动态海水')
    this.ocean = new Ocean(timeUniform)
    this.sceneManager.scene.add(this.ocean.group)

    await step(0.44, '种植森林与草地')
    this.forest = new Forest()
    this.sceneManager.scene.add(this.forest.group)

    await step(0.55, '搭建小屋、栈道与石桥')
    this.scenery = new Scenery(timeUniform)
    this.sceneManager.scene.add(this.scenery.group)

    await step(0.64, '培育珊瑚与海草')
    this.seaweed = new Seaweed()
    this.sceneManager.scene.add(this.seaweed.group)

    await step(0.72, '唤醒海洋生物')
    this.seaLife = new SeaLife()
    this.whale = new Whale()
    this.fish = new FishSchools()
    this.jellyfish = new Jellyfish()
    this.sceneManager.scene.add(this.seaLife.group)
    this.sceneManager.scene.add(this.whale.group)
    this.sceneManager.scene.add(this.fish.group)
    this.sceneManager.scene.add(this.jellyfish.group)

    await step(0.85, '撒入果冻颗粒与气泡')
    this.particles = new Particles()
    this.particles.setPixelRatio(this.engine.renderer.getPixelRatio())
    this.sceneManager.scene.add(this.particles.group)

    await step(0.94, '连接观察与交互')
    this.interaction = new Interaction(this.canvas, this.cameraManager.camera, {
      onSpecies: (id) => this.callbacks.onSpeciesSelect?.(id),
      onView: (view) => this.setView(view),
    })
    this.interaction.setPickables([...this.whale.pickables, ...this.jellyfish.pickables])
    this.interaction.setSceneRefs(this.terrain.mesh, this.ocean.surface)

    this.sandbox.group.name = 'sandbox'
    this.terrain.mesh.name = 'terrain'
    this.ocean.group.name = 'ocean'
    this.forest.group.name = 'forest'
    this.scenery.group.name = 'scenery'
    this.seaweed.group.name = 'seaweed'
    this.whale.group.name = 'whale'
    this.fish.group.name = 'fish'
    this.jellyfish.group.name = 'jellyfish'
    this.particles.group.name = 'particles'

    if (import.meta.env.DEV) {
      ;(window as unknown as { __jelly: unknown }).__jelly = {
        scene: this.sceneManager.scene,
        renderer: this.engine.renderer,
        app: this,
        whale: this.whale,
      }
    }

    this.cameraManager.setView('overview', true)
    this.callbacks.onViewChange?.('overview')
    this.engine.start()
    this.callbacks.onReady?.()
    this.emitStats()
  }

  private tick(dt: number, elapsed: number): void {
    if (this.disposed) return
    timeUniform.value = elapsed

    this.sandbox.update(dt)
    this.scenery.update(elapsed)
    this.seaweed.update(elapsed)
    this.seaLife.update(elapsed, dt)
    this.whale.update(dt, elapsed)
    this.jellyfish.update(elapsed)
    this.ocean.update(elapsed, this.cameraManager.camera)
    this.particles.setCameraDistance(
      this.cameraManager.camera.position.distanceTo(this.cameraManager.controls.target),
    )
    this.sceneManager.update(elapsed)
    this.cameraManager.update()

    const cam = this.cameraManager.camera
    const underwater = cam.position.y < -0.45
    if (underwater !== this.underwater) {
      this.underwater = underwater
      this.sceneManager.setUnderwater(underwater)
      this.lighting.setUnderwater(underwater)
      this.post.setBloomStrength(underwater ? 0.34 : 0.26)
      cam.near = underwater ? 0.12 : 0.3
      cam.updateProjectionMatrix()
    }
    this.sandbox.setInteriorTarget(underwater ? 1 : 0)

    this.post.render()

    this.statsTimer += dt
    if (this.statsTimer > 0.5) {
      this.statsTimer = 0
      this.emitStats()
    }
  }

  private emitStats(): void {
    if (!this.particles) return
    this.callbacks.onStats?.({
      fps: this.engine.fps,
      particles: this.particles.count,
      creatures: 100,
      fish: this.fish?.total ?? 0,
      jellies: 6,
      view: this.cameraManager.view,
      underwater: this.underwater,
    })
  }

  setView(view: ViewKey): void {
    this.cameraManager.setView(view)
    this.callbacks.onViewChange?.(view)
  }

  setPaused(paused: boolean): void {
    this.ticker.setPaused(paused)
  }

  setParticleDensity(ratio: number): void {
    this.particles?.setDensity(ratio)
    this.emitStats()
  }

  setWaterOpacity(value: number): void {
    this.ocean?.setOpacity(value)
  }

  setLightIntensity(value: number): void {
    this.lighting?.setIntensity(value)
  }

  private onResize = (): void => {
    const width = this.width()
    const height = this.height()
    this.engine.setSize(width, height)
    this.cameraManager.resize(width, height)
    this.post.setSize(width, height)
    this.particles?.setPixelRatio(this.engine.renderer.getPixelRatio())
  }

  dispose(): void {
    this.disposed = true
    window.removeEventListener('resize', this.onResize)
    this.interaction?.dispose()
    this.whale?.dispose()
    this.jellyfish?.dispose()
    this.fish?.dispose()
    this.seaLife?.dispose()
    this.seaweed?.dispose()
    this.scenery?.dispose()
    this.forest?.dispose()
    this.ocean?.dispose()
    this.terrain?.dispose()
    this.sandbox?.dispose()
    this.particles?.dispose()
    this.cameraManager.dispose()
    this.post.dispose()
    this.engine.dispose()
    this.sceneManager.dispose()
  }
}
