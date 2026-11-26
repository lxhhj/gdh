<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import HudFrame from './components/HudFrame.vue'
import TitleBar from './components/TitleBar.vue'
import InfoPanel from './components/InfoPanel.vue'
import ControlBar from './components/ControlBar.vue'
import SpeciesCard from './components/SpeciesCard.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import { JellySeaApp } from './three/JellySeaApp'
import { SPECIES, type SpeciesInfo, type ViewKey } from './three/config'
import { ui } from './stores/useApp'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let app: JellySeaApp | null = null

const selected = computed<SpeciesInfo | null>(() => (ui.card ? SPECIES[ui.card] : null))

function changeView(view: ViewKey): void {
  ui.view = view
  app?.setView(view)
}

function togglePause(): void {
  ui.paused = !ui.paused
}

function onKeyDown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.code === 'Space') {
    e.preventDefault()
    togglePause()
  } else if (e.key === '1') changeView('overview')
  else if (e.key === '2') changeView('land')
  else if (e.key === '3') changeView('ocean')
  else if (e.key === '4') changeView('underwater')
  else if (e.key === 'Escape') ui.card = null
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  if (!canvasRef.value) return

  app = new JellySeaApp(canvasRef.value, {
    onProgress: (progress, label) => {
      ui.progress = progress
      ui.progressLabel = label
    },
    onFps: (fps) => {
      ui.fps = fps
    },
    onStats: (stats) => {
      ui.fps = stats.fps
      ui.particles = stats.particles
      ui.creatures = stats.creatures
      ui.fish = stats.fish
      ui.jellies = stats.jellies
      ui.view = stats.view
      ui.underwater = stats.underwater
    },
    onViewChange: (view) => {
      ui.view = view
    },
    onSpeciesSelect: (id) => {
      ui.card = id
    },
    onReady: () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            ui.progress = 1
            ui.ready = true
          }, 420)
        }),
      )
    },
  })

  await app.init()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  app?.dispose()
  app = null
})

watch(
  () => ui.paused,
  (v) => app?.setPaused(v),
)
watch(
  () => ui.density,
  (v) => app?.setParticleDensity(v),
)
watch(
  () => ui.waterOpacity,
  (v) => app?.setWaterOpacity(v),
)
watch(
  () => ui.light,
  (v) => app?.setLightIntensity(v),
)
</script>

<template>
  <div class="app">
    <canvas ref="canvasRef" class="scene-canvas" />

    <div class="vignette" />
    <div class="grain" />

    <HudFrame />
    <TitleBar :ready="ui.ready" />
    <InfoPanel />

    <div class="hint" :class="{ dim: !ui.ready }">
      <b>拖动</b> 旋转 · <b>滚轮</b> 缩放 · <b>右键</b> 平移 · <b>点击</b> 生物或山海查看
    </div>

    <Transition name="card">
      <SpeciesCard v-if="selected" :species="selected" @close="ui.card = null" />
    </Transition>

    <ControlBar
      :view="ui.view"
      :paused="ui.paused"
      :density="ui.density"
      :water-opacity="ui.waterOpacity"
      :light="ui.light"
      @view="changeView"
      @toggle-pause="togglePause"
      @update:density="ui.density = $event"
      @update:waterOpacity="ui.waterOpacity = $event"
      @update:light="ui.light = $event"
    />

    <Transition name="fade">
      <LoadingOverlay v-if="!ui.ready" :progress="ui.progress" :label="ui.progressLabel" />
    </Transition>
  </div>
</template>

<style scoped>
.hint {
  transition: opacity 0.8s ease;
}

.hint.dim {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.9s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.card-enter-active,
.card-leave-active {
  transition:
    opacity 0.45s ease,
    transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
</style>
