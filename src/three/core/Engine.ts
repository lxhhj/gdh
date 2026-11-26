import * as THREE from 'three'
import type { Ticker } from './Ticker'
import { QUALITY } from '../config'

export interface EngineCallbacks {
  onFps?: (fps: number) => void
  onResize?: (width: number, height: number) => void
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer
  private ticker: Ticker
  private callbacks: EngineCallbacks
  private updateFn: ((delta: number, elapsed: number) => void) | null = null
  private frames = 0
  private fpsStart = performance.now()
  fps = 60
  private running = false
  private hasRendered = false

  constructor(canvas: HTMLCanvasElement, ticker: Ticker, callbacks: EngineCallbacks = {}) {
    this.ticker = ticker
    this.callbacks = callbacks
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.pixelRatioCap))
    this.renderer.setClearColor(0x030b18, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.95
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  setUpdate(fn: (delta: number, elapsed: number) => void): void {
    this.updateFn = fn
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.renderer.setAnimationLoop(() => this.loop())
  }

  stop(): void {
    this.running = false
    this.renderer.setAnimationLoop(null)
  }

  private loop(): void {
    this.ticker.update()
    this.updateFn?.(this.ticker.delta, this.ticker.elapsed)

    this.frames++
    const now = performance.now()
    if (now - this.fpsStart >= 600) {
      this.fps = Math.round((this.frames * 1000) / (now - this.fpsStart))
      this.frames = 0
      this.fpsStart = now
      this.callbacks.onFps?.(this.fps)
    }
  }

  setSize(width: number, height: number): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.pixelRatioCap))
    this.renderer.setSize(width, height, false)
    this.callbacks.onResize?.(width, height)
  }

  get width(): number {
    return this.renderer.domElement.clientWidth
  }

  get height(): number {
    return this.renderer.domElement.clientHeight
  }

  hasRenderedFrame(): boolean {
    return this.hasRendered
  }

  markRendered(): void {
    this.hasRendered = true
  }

  dispose(): void {
    this.stop()
    this.renderer.dispose()
  }
}
