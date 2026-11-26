import * as THREE from 'three'
import type { SpeciesId, ViewKey } from '../config'

export interface InteractionCallbacks {
  onSpecies: (id: SpeciesId) => void
  onView: (view: ViewKey) => void
}

export class Interaction {
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private pickables: THREE.Object3D[] = []
  private terrain: THREE.Mesh | null = null
  private water: THREE.Mesh | null = null
  private down = { x: 0, y: 0 }
  private hoverAt = 0
  private dom: HTMLElement
  private camera: THREE.Camera
  private callbacks: InteractionCallbacks

  constructor(dom: HTMLElement, camera: THREE.Camera, callbacks: InteractionCallbacks) {
    this.dom = dom
    this.camera = camera
    this.callbacks = callbacks
    dom.style.cursor = 'grab'
    dom.addEventListener('pointerdown', this.onPointerDown)
    dom.addEventListener('pointerup', this.onPointerUp)
    dom.addEventListener('pointermove', this.onPointerMove)
    dom.addEventListener('pointerleave', this.onPointerLeave)
  }

  setPickables(objects: THREE.Object3D[]): void {
    this.pickables = objects
  }

  setSceneRefs(terrain: THREE.Mesh, water: THREE.Mesh): void {
    this.terrain = terrain
    this.water = water
  }

  private updatePointer(e: PointerEvent): void {
    const rect = this.dom.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    this.down.x = e.clientX
    this.down.y = e.clientY
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (e.button !== 0) return
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y)
    if (moved > 7) return

    this.updatePointer(e)
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const creatureHit = this.raycaster.intersectObjects(this.pickables, true)[0]
    if (creatureHit) {
      let obj: THREE.Object3D | null = creatureHit.object
      while (obj) {
        const species = obj.userData.species as SpeciesId | undefined
        if (species) {
          this.callbacks.onSpecies(species)
          return
        }
        obj = obj.parent
      }
    }

    const waterHit = this.water ? this.raycaster.intersectObject(this.water, false)[0] : undefined
    const landHit = this.terrain ? this.raycaster.intersectObject(this.terrain, false)[0] : undefined

    if (waterHit && (!landHit || waterHit.distance <= landHit.distance)) {
      this.callbacks.onView('underwater')
      return
    }
    if (landHit) {
      if (landHit.point.y > 2.3) this.callbacks.onView('land')
      else if (landHit.point.y < 0.35) this.callbacks.onView('ocean')
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    const now = performance.now()
    if (now - this.hoverAt < 70) return
    this.hoverAt = now
    this.updatePointer(e)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(this.pickables, true).length > 0
    this.dom.style.cursor = hit ? 'pointer' : 'grab'
  }

  private onPointerLeave = (): void => {
    this.dom.style.cursor = 'grab'
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.onPointerDown)
    this.dom.removeEventListener('pointerup', this.onPointerUp)
    this.dom.removeEventListener('pointermove', this.onPointerMove)
    this.dom.removeEventListener('pointerleave', this.onPointerLeave)
    this.pickables.length = 0
    this.terrain = null
    this.water = null
  }
}
