import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import gsap from 'gsap'
import { VIEW_PRESETS, type ViewKey } from '../config'
import { clamp } from './math'

interface ViewLimits {
  minPolarAngle: number
  maxPolarAngle: number
  minAzimuthAngle: number
  maxAzimuthAngle: number
}

const LIMITS: Record<ViewKey, ViewLimits> = {
  overview: {
    minPolarAngle: 0.22,
    maxPolarAngle: 1.3,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
  },
  land: {
    minPolarAngle: 0.3,
    maxPolarAngle: 1.48,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
  },
  ocean: {
    minPolarAngle: 0.3,
    maxPolarAngle: 1.5,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
  },
  underwater: {
    minPolarAngle: 1.02,
    maxPolarAngle: 1.72,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
  },
}

export class CameraManager {
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls
  private tweenProxy = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 }
  private transitioning = false
  private currentView: ViewKey = 'overview'
  onViewChange?: (view: ViewKey) => void

  constructor(domElement: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.3, 420)
    this.camera.position.set(38, 27, 38)

    this.controls = new OrbitControls(this.camera, domElement)
    this.controls.target.set(0, -1.0, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.055
    this.controls.rotateSpeed = 0.6
    this.controls.zoomSpeed = 0.8
    this.controls.panSpeed = 0.6
    this.controls.screenSpacePanning = true
    this.controls.minDistance = 30
    this.controls.maxDistance = 100
    this.controls.minPolarAngle = LIMITS.overview.minPolarAngle
    this.controls.maxPolarAngle = LIMITS.overview.maxPolarAngle
    this.controls.autoRotate = false
    this.controls.update()
  }

  get view(): ViewKey {
    return this.currentView
  }

  setView(view: ViewKey, immediate = false, onComplete?: () => void): void {
    const preset = VIEW_PRESETS[view]
    const limits = LIMITS[view]
    this.currentView = view
    this.transitioning = true
    this.controls.enabled = false
    this.controls.minDistance = preset.minDistance
    this.controls.maxDistance = preset.maxDistance
    this.controls.minPolarAngle = limits.minPolarAngle
    this.controls.maxPolarAngle = limits.maxPolarAngle

    const proxy = this.tweenProxy
    proxy.px = this.camera.position.x
    proxy.py = this.camera.position.y
    proxy.pz = this.camera.position.z
    proxy.tx = this.controls.target.x
    proxy.ty = this.controls.target.y
    proxy.tz = this.controls.target.z

    const apply = (): void => {
      this.camera.position.set(proxy.px, proxy.py, proxy.pz)
      this.controls.target.set(proxy.tx, proxy.ty, proxy.tz)
      this.camera.lookAt(this.controls.target)
    }

    gsap.killTweensOf(proxy)

    if (immediate) {
      proxy.px = preset.position[0]
      proxy.py = preset.position[1]
      proxy.pz = preset.position[2]
      proxy.tx = preset.target[0]
      proxy.ty = preset.target[1]
      proxy.tz = preset.target[2]
      apply()
      this.finishTransition(onComplete)
      return
    }

    gsap.to(proxy, {
      px: preset.position[0],
      py: preset.position[1],
      pz: preset.position[2],
      tx: preset.target[0],
      ty: preset.target[1],
      tz: preset.target[2],
      duration: 1.65,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: apply,
      onComplete: () => this.finishTransition(onComplete),
    })
    this.onViewChange?.(view)
  }

  private finishTransition(onComplete?: () => void): void {
    this.transitioning = false
    this.controls.enabled = true
    this.controls.update()
    onComplete?.()
  }

  /** 平滑聚焦某个世界坐标（保持当前距离） */
  focusOn(point: THREE.Vector3, distance?: number): void {
    const dir = this.camera.position.clone().sub(this.controls.target).normalize()
    const dist = distance ?? this.camera.position.distanceTo(this.controls.target)
    const proxy = this.tweenProxy
    proxy.px = this.camera.position.x
    proxy.py = this.camera.position.y
    proxy.pz = this.camera.position.z
    proxy.tx = this.controls.target.x
    proxy.ty = this.controls.target.y
    proxy.tz = this.controls.target.z
    this.controls.enabled = false
    this.transitioning = true
    gsap.to(proxy, {
      tx: point.x,
      ty: point.y,
      tz: point.z,
      px: point.x + dir.x * dist,
      py: point.y + dir.y * dist,
      pz: point.z + dir.z * dist,
      duration: 1.2,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => {
        this.camera.position.set(proxy.px, proxy.py, proxy.pz)
        this.controls.target.set(proxy.tx, proxy.ty, proxy.tz)
        this.camera.lookAt(this.controls.target)
      },
      onComplete: () => this.finishTransition(),
    })
  }

  update(): void {
    if (!this.transitioning) {
      this.controls.update()
      this.controls.target.x = clamp(this.controls.target.x, -13, 13)
      this.controls.target.z = clamp(this.controls.target.z, -13, 13)
      this.controls.target.y = clamp(this.controls.target.y, -6.5, 6)
      // 避免相机穿透沙盒底部
      if (this.camera.position.y < -7.2) this.camera.position.y = -7.2
    }
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  dispose(): void {
    gsap.killTweensOf(this.tweenProxy)
    this.controls.dispose()
  }
}
