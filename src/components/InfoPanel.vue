<script setup lang="ts">
import { ui, REGION_STATS } from '@/stores/useApp'
import { VIEW_PRESETS } from '@/three/config'
import { computed } from 'vue'

const viewLabel = computed(() => VIEW_PRESETS[ui.view].label)
</script>

<template>
  <aside class="info glass">
    <div class="head">
      <span class="dot" :class="{ paused: ui.paused }" />
      <span class="head-title">ECOSYSTEM STATUS</span>
      <span class="head-code">JS·01</span>
    </div>

    <div class="status">
      <span class="label">场景运行状态</span>
      <span class="value" :class="{ paused: ui.paused }">{{ ui.paused ? 'PAUSED' : 'LIVE' }}</span>
    </div>

    <div class="regions">
      <div class="region">
        <div class="row"><span>海洋区域</span><span>{{ REGION_STATS.ocean }}%</span></div>
        <div class="bar"><i class="ocean" :style="{ width: REGION_STATS.ocean + '%' }" /></div>
      </div>
      <div class="region">
        <div class="row"><span>陆地区域</span><span>{{ REGION_STATS.land }}%</span></div>
        <div class="bar"><i class="land" :style="{ width: REGION_STATS.land + '%' }" /></div>
      </div>
    </div>

    <div class="divider" />

    <div class="grid">
      <div class="cell"><span class="k">鲸鱼</span><span class="v mono">01</span></div>
      <div class="cell"><span class="k">鱼群</span><span class="v mono">{{ String(ui.fish).padStart(2, '0') }}</span></div>
      <div class="cell"><span class="k">水母</span><span class="v mono">{{ String(ui.jellies).padStart(2, '0') }}</span></div>
      <div class="cell"><span class="k">生物总数</span><span class="v mono">{{ ui.creatures }}</span></div>
    </div>

    <div class="divider" />

    <div class="telemetry">
      <div class="row"><span class="k">粒子数量</span><span class="v mono">{{ ui.particles.toLocaleString() }}</span></div>
      <div class="row"><span class="k">实时帧率</span><span class="v mono">{{ ui.fps }} <em>FPS</em></span></div>
    </div>

    <div class="foot">
      <span>VIEW · {{ viewLabel }}</span>
      <span :class="{ warn: ui.underwater }">{{ ui.underwater ? 'UNDERWATER' : 'SURFACE' }}</span>
    </div>
  </aside>
</template>

<style scoped>
.info {
  position: absolute;
  top: 34px;
  right: 38px;
  z-index: 6;
  width: 258px;
  padding: 16px 17px 13px;
  font-size: 11px;
  animation: slideIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mint);
  box-shadow: 0 0 10px var(--mint);
  animation: pulse 2.4s ease-in-out infinite;
}

.dot.paused {
  background: #ffb86b;
  box-shadow: 0 0 10px #ffb86b;
  animation: none;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

.head-title {
  font-size: 9px;
  letter-spacing: 0.24em;
  color: var(--ink-dim);
  flex: 1;
}

.head-code {
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.status {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 11px 0 3px;
}

.label {
  color: var(--ink-dim);
  letter-spacing: 0.08em;
}

.value {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--mint);
  text-shadow: 0 0 12px rgba(63, 224, 176, 0.55);
}

.value.paused {
  color: #ffc27a;
  text-shadow: 0 0 12px rgba(255, 194, 122, 0.45);
}

.regions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.region .row,
.telemetry .row {
  display: flex;
  justify-content: space-between;
  color: var(--ink-faint);
  font-size: 10px;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.bar {
  height: 3px;
  border-radius: 2px;
  background: rgba(102, 242, 255, 0.08);
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
}

.bar i.ocean {
  background: linear-gradient(90deg, #1f7fd0, var(--cyan));
  box-shadow: 0 0 10px rgba(102, 242, 255, 0.5);
}

.bar i.land {
  background: linear-gradient(90deg, #237a55, var(--mint));
  box-shadow: 0 0 10px rgba(63, 224, 176, 0.4);
}

.divider {
  height: 1px;
  margin: 12px 0 10px;
  background: linear-gradient(90deg, transparent, var(--line), transparent);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
}

.cell {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(102, 242, 255, 0.04);
  border: 1px solid rgba(102, 242, 255, 0.07);
}

.k {
  color: var(--ink-faint);
  font-size: 10px;
}

.v {
  color: rgba(226, 249, 255, 0.9);
  font-size: 12px;
  letter-spacing: 0.06em;
}

.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
}

em {
  font-style: normal;
  font-size: 7px;
  color: var(--ink-faint);
  letter-spacing: 0.1em;
}

.telemetry {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.telemetry .row {
  margin: 0;
}

.telemetry .v {
  font-size: 10px;
  color: var(--cyan);
}

.foot {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 9px;
  border-top: 1px solid var(--line-soft);
  font-size: 8px;
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}

.foot .warn {
  color: var(--cyan);
  text-shadow: 0 0 10px rgba(102, 242, 255, 0.5);
}

@media (max-width: 900px) {
  .info {
    top: auto;
    right: 16px;
    bottom: 150px;
    width: 210px;
    font-size: 10px;
    padding: 12px;
  }
  .grid {
    display: none;
  }
}
</style>
