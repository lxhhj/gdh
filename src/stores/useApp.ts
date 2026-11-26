import { reactive } from 'vue'
import type { SpeciesId, ViewKey } from '@/three/config'

export interface AppUiState {
  view: ViewKey
  paused: boolean
  density: number
  waterOpacity: number
  light: number
  fps: number
  particles: number
  creatures: number
  fish: number
  jellies: number
  underwater: boolean
  card: SpeciesId | null
  ready: boolean
  progress: number
  progressLabel: string
}

export const ui = reactive<AppUiState>({
  view: 'overview',
  paused: false,
  density: 1,
  waterOpacity: 0.66,
  light: 1,
  fps: 60,
  particles: 5000,
  creatures: 100,
  fish: 78,
  jellies: 6,
  underwater: false,
  card: null,
  ready: false,
  progress: 0,
  progressLabel: '正在汇聚果冻…',
})

export const REGION_STATS = {
  ocean: 62,
  land: 38,
}
