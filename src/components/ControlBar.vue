<script setup lang="ts">
import type { ViewKey } from '@/three/config'

const props = defineProps<{
  view: ViewKey
  paused: boolean
  density: number
  waterOpacity: number
  light: number
}>()

const emit = defineEmits<{
  view: [key: ViewKey]
  togglePause: []
  'update:density': [value: number]
  'update:waterOpacity': [value: number]
  'update:light': [value: number]
}>()

const views: Array<{ key: ViewKey; label: string; en: string }> = [
  { key: 'overview', label: '远景', en: 'FAR' },
  { key: 'land', label: '陆地', en: 'LAND' },
  { key: 'ocean', label: '海洋', en: 'SEA' },
  { key: 'underwater', label: '海底', en: 'DEEP' },
]

const readNumber = (e: Event): number => Number((e.target as HTMLInputElement).value)

function onDensity(e: Event): void {
  emit('update:density', readNumber(e))
}
function onWaterOpacity(e: Event): void {
  emit('update:waterOpacity', readNumber(e))
}
function onLight(e: Event): void {
  emit('update:light', readNumber(e))
}
</script>

<template>
  <div class="controls">
    <div class="bar glass">
      <div class="views">
        <button
          v-for="v in views"
          :key="v.key"
          class="view-btn"
          :class="{ active: props.view === v.key }"
          type="button"
          @click="emit('view', v.key)"
        >
          <span class="cn">{{ v.label }}</span>
          <span class="en">{{ v.en }}</span>
        </button>
      </div>

      <div class="separator" />

      <button
        class="play-btn"
        type="button"
        :aria-label="paused ? '继续动画' : '暂停动画'"
        @click="emit('togglePause')"
      >
        <svg v-if="paused" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" />
          <rect x="13.6" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" />
        </svg>
      </button>

      <div class="separator" />

      <label class="slider">
        <span class="slider-head">
          <span>粒子密度</span>
          <b>{{ Math.round(props.density * 100) }}%</b>
        </span>
        <input
          type="range"
          min="0.2"
          max="1.5"
          step="0.05"
          :value="props.density"
          @input="onDensity"
        />
      </label>

      <label class="slider">
        <span class="slider-head">
          <span>海水透明度</span>
          <b>{{ Math.round(props.waterOpacity * 100) }}%</b>
        </span>
        <input
          type="range"
          min="0.3"
          max="0.95"
          step="0.01"
          :value="props.waterOpacity"
          @input="onWaterOpacity"
        />
      </label>

      <label class="slider">
        <span class="slider-head">
          <span>环境光强度</span>
          <b>{{ Math.round(props.light * 100) }}%</b>
        </span>
        <input type="range" min="0.5" max="1.8" step="0.02" :value="props.light" @input="onLight" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.controls {
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 7;
  max-width: calc(100vw - 60px);
  animation: rise 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.45s both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translate(-50%, 16px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 16px;
  border-radius: 18px;
  flex-wrap: wrap;
  justify-content: center;
  row-gap: 8px;
}

.views {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 12px;
  background: rgba(2, 12, 22, 0.42);
  border: 1px solid rgba(102, 242, 255, 0.08);
}

.view-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 56px;
  padding: 5px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--ink-dim);
  cursor: pointer;
  transition: all 0.28s ease;
}

.view-btn .cn {
  font-size: 11px;
  letter-spacing: 0.12em;
}

.view-btn .en {
  font-size: 7px;
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}

.view-btn:hover {
  color: var(--ink);
  background: rgba(102, 242, 255, 0.07);
  border-color: rgba(102, 242, 255, 0.16);
}

.view-btn.active {
  color: #041521;
  background: linear-gradient(135deg, #7df5ff, #63e2c0);
  border-color: rgba(180, 255, 250, 0.55);
  box-shadow: 0 0 18px rgba(102, 242, 255, 0.35);
}

.view-btn.active .en {
  color: rgba(4, 21, 33, 0.55);
}

.separator {
  width: 1px;
  height: 30px;
  background: linear-gradient(180deg, transparent, rgba(102, 242, 255, 0.22), transparent);
}

.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(102, 242, 255, 0.24);
  background: radial-gradient(circle at 35% 30%, rgba(102, 242, 255, 0.16), rgba(4, 18, 33, 0.5));
  color: var(--cyan);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.25s ease;
}

.play-btn svg {
  width: 18px;
  height: 18px;
}

.play-btn:hover {
  border-color: rgba(102, 242, 255, 0.55);
  box-shadow: 0 0 18px rgba(102, 242, 255, 0.25);
  transform: scale(1.04);
}

.slider {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 112px;
  cursor: pointer;
}

.slider-head {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
}

.slider-head b {
  font-weight: 500;
  color: rgba(200, 240, 255, 0.8);
  font-variant-numeric: tabular-nums;
}

input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(102, 242, 255, 0.75), rgba(102, 242, 255, 0.16));
  outline: none;
  cursor: pointer;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: #e6feff;
  box-shadow: 0 0 10px rgba(102, 242, 255, 0.85);
  cursor: pointer;
}

input[type='range']::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 50%;
  background: #e6feff;
  box-shadow: 0 0 10px rgba(102, 242, 255, 0.85);
  cursor: pointer;
}

@media (max-width: 1400px) {
  .bar {
    gap: 10px;
    padding: 8px 12px;
  }
  .view-btn {
    min-width: 50px;
    padding: 4px 7px;
  }
  .slider {
    min-width: 96px;
  }
}

@media (max-width: 1100px) {
  .controls {
    bottom: 18px;
    max-width: calc(100vw - 24px);
  }
  .bar {
    padding: 8px 10px;
    gap: 8px;
  }
  .separator {
    display: none;
  }
}

@media (max-width: 640px) {
  .slider {
    min-width: 88px;
  }
  .view-btn {
    min-width: 44px;
    padding: 4px 6px;
  }
}
</style>
