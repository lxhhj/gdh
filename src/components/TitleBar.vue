<script setup lang="ts">
defineProps<{ ready: boolean }>()
</script>

<template>
  <header class="titlebar" :class="{ 'is-ready': ready }">
    <div class="mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="markGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stop-color="#66f2ff" />
            <stop offset="0.55" stop-color="#3fe0b0" />
            <stop offset="1" stop-color="#b48cff" />
          </linearGradient>
        </defs>
        <rect x="6" y="8" width="36" height="32" rx="10" stroke="url(#markGrad)" stroke-width="1.4" />
        <path d="M11 22c5-3.5 10-3.5 14 0s9 3.5 12 0" stroke="url(#markGrad)" stroke-width="1.2" opacity=".8" />
        <circle cx="18" cy="18" r="1.6" fill="#66f2ff" />
        <circle cx="29" cy="28" r="1.2" fill="#b48cff" />
        <circle cx="34" cy="17" r="0.9" fill="#3fe0b0" />
        <circle cx="15" cy="30" r="0.9" fill="#9fe9ff" opacity=".75" />
      </svg>
    </div>
    <div class="text">
      <div class="eyebrow">MICRO ECOSYSTEM · 01</div>
      <h1>JELLY SEA</h1>
      <p class="cn">果冻海 · 微型生态世界</p>
      <p class="sub">探索一片藏在果冻中的海洋宇宙</p>
    </div>
  </header>
</template>

<style scoped>
.titlebar {
  position: absolute;
  top: 34px;
  left: 38px;
  z-index: 6;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  pointer-events: none;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 1.1s ease 0.15s, transform 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s;
}

.titlebar.is-ready {
  opacity: 1;
  transform: translateY(0);
}

.mark {
  width: 44px;
  height: 44px;
  filter: drop-shadow(0 0 12px rgba(102, 242, 255, 0.35));
  flex: none;
  margin-top: 2px;
}

.mark svg {
  width: 100%;
  height: 100%;
}

.eyebrow {
  font-size: 9px;
  letter-spacing: 0.32em;
  color: var(--ink-faint);
  margin-bottom: 6px;
}

h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.36em;
  background: linear-gradient(100deg, #f2feff 0%, #8ff5ff 45%, #b9a4ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 18px rgba(102, 242, 255, 0.25));
}

.cn {
  margin: 9px 0 0;
  font-size: 12px;
  letter-spacing: 0.3em;
  color: rgba(225, 247, 255, 0.86);
}

.sub {
  margin: 7px 0 0;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}

@media (max-width: 900px) {
  .titlebar {
    top: 22px;
    left: 22px;
  }
  h1 {
    font-size: 22px;
  }
  .sub {
    display: none;
  }
}
</style>
