<script setup lang="ts">
import type { SpeciesInfo } from '@/three/config'

defineProps<{ species: SpeciesInfo }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <section class="card glass" :style="{ '--accent': species.accent }">
    <div class="accent-line" />
    <button class="close" type="button" aria-label="关闭" @click="emit('close')">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
    </button>

    <div class="eyebrow">SPECIES FILE · {{ species.en.toUpperCase() }}</div>
    <h2>
      {{ species.name }}
      <span>{{ species.en }}</span>
    </h2>
    <p class="tagline">{{ species.tagline }}</p>
    <p class="desc">{{ species.description }}</p>

    <div class="metrics">
      <div v-for="m in species.metrics" :key="m.label" class="metric">
        <span>{{ m.label }}</span>
        <b>{{ m.value }}</b>
      </div>
    </div>

    <div class="tags">
      <span v-for="t in species.tags" :key="t">{{ t }}</span>
    </div>
  </section>
</template>

<style scoped>
.card {
  position: absolute;
  right: 38px;
  bottom: 122px;
  z-index: 9;
  width: 326px;
  padding: 20px 20px 16px;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
  box-shadow:
    0 24px 60px rgba(0, 6, 16, 0.55),
    0 0 40px color-mix(in srgb, var(--accent) 12%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.accent-line {
  position: absolute;
  top: 0;
  left: 18px;
  right: 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  box-shadow: 0 0 14px var(--accent);
}

.close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid rgba(102, 242, 255, 0.14);
  background: rgba(4, 18, 33, 0.45);
  color: var(--ink-dim);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close svg {
  width: 13px;
  height: 13px;
}

.close:hover {
  color: var(--ink);
  border-color: rgba(102, 242, 255, 0.4);
}

.eyebrow {
  font-size: 8px;
  letter-spacing: 0.26em;
  color: color-mix(in srgb, var(--accent) 78%, white 10%);
  margin-bottom: 10px;
}

h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0.18em;
  display: flex;
  align-items: baseline;
  gap: 9px;
}

h2 span {
  font-size: 10px;
  letter-spacing: 0.2em;
  font-weight: 400;
  color: var(--ink-faint);
}

.tagline {
  margin: 7px 0 0;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--accent);
  opacity: 0.85;
}

.desc {
  margin: 14px 0 0;
  font-size: 11.5px;
  line-height: 1.85;
  letter-spacing: 0.03em;
  color: var(--ink-dim);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 16px;
}

.metric {
  padding: 8px 9px;
  border-radius: 9px;
  background: rgba(102, 242, 255, 0.045);
  border: 1px solid rgba(102, 242, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric span {
  font-size: 8px;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
}

.metric b {
  font-size: 11px;
  font-weight: 500;
  color: rgba(232, 250, 255, 0.92);
  letter-spacing: 0.04em;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 13px;
}

.tags span {
  font-size: 8.5px;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: 20px;
  color: var(--ink-dim);
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  background: color-mix(in srgb, var(--accent) 7%, transparent);
}

@media (max-width: 900px) {
  .card {
    right: 16px;
    bottom: 150px;
    width: 290px;
  }
}
</style>
