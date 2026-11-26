<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ progress: number; label: string }>()
const percent = computed(() => Math.round(Math.min(1, Math.max(0, props.progress)) * 100))
</script>

<template>
  <div class="overlay">
    <div class="ambient" />
    <div class="core">
      <div class="logo">
        <svg viewBox="0 0 96 96" fill="none">
          <defs>
            <linearGradient id="loadGrad" x1="12" y1="12" x2="84" y2="84" gradientUnits="userSpaceOnUse">
              <stop stop-color="#66f2ff" />
              <stop offset="0.55" stop-color="#3fe0b0" />
              <stop offset="1" stop-color="#b48cff" />
            </linearGradient>
          </defs>
          <rect x="16" y="22" width="64" height="54" rx="17" stroke="url(#loadGrad)" stroke-width="1.6" opacity="0.9" />
          <path d="M24 46c8-6 17-6 24 0s16 6 24 0" stroke="url(#loadGrad)" stroke-width="1.4" opacity="0.7" />
          <circle cx="38" cy="38" r="2.6" fill="#66f2ff">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="58" cy="56" r="2" fill="#b48cff">
            <animate attributeName="opacity" values="1;0.35;1" dur="3.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="66" cy="36" r="1.5" fill="#3fe0b0" />
          <circle cx="30" cy="58" r="1.5" fill="#9fe9ff" opacity="0.8" />
        </svg>
      </div>
      <div class="name">JELLY SEA</div>
      <div class="caption">果冻海 · 微型生态世界</div>
      <div class="track">
        <i :style="{ width: Math.max(5, percent) + '%' }" />
      </div>
      <div class="meta">
        <span>{{ label }}</span>
        <span class="num">{{ percent }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse 55% 50% at 50% 48%, #082238 0%, #030b18 62%, #010509 100%);
  overflow: hidden;
}

.ambient {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 30% 35%, rgba(102, 242, 255, 0.1), transparent 45%),
    radial-gradient(circle at 70% 65%, rgba(180, 140, 255, 0.1), transparent 45%);
  filter: blur(10px);
  animation: drift 12s ease-in-out infinite alternate;
}

@keyframes drift {
  from {
    transform: translate3d(-2%, -1%, 0) scale(1);
  }
  to {
    transform: translate3d(2%, 2%, 0) scale(1.05);
  }
}

.core {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 280px;
}

.logo {
  width: 92px;
  height: 92px;
  filter: drop-shadow(0 0 26px rgba(102, 242, 255, 0.32));
  animation: float 4.5s ease-in-out infinite;
}

.logo svg {
  width: 100%;
  height: 100%;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-7px) scale(1.02);
  }
}

.name {
  margin-top: 18px;
  font-size: 18px;
  letter-spacing: 0.5em;
  padding-left: 0.5em;
  background: linear-gradient(100deg, #f2feff, #8ff5ff 50%, #b9a4ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.caption {
  margin-top: 10px;
  font-size: 9px;
  letter-spacing: 0.3em;
  color: var(--ink-faint);
}

.track {
  margin-top: 34px;
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: rgba(102, 242, 255, 0.12);
  overflow: hidden;
}

.track i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #3fe0b0, #66f2ff 60%, #b48cff);
  box-shadow: 0 0 14px rgba(102, 242, 255, 0.65);
  transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.meta {
  margin-top: 10px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 8.5px;
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}

.meta .num {
  color: rgba(200, 240, 255, 0.7);
  font-variant-numeric: tabular-nums;
}
</style>
