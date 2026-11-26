<template>
  <div class="hud" aria-hidden="true">
    <div class="corner tl" />
    <div class="corner tr" />
    <div class="corner bl" />
    <div class="corner br" />
    <div class="side-label left">SANDBOX · 40 × 22 × 40</div>
    <div class="side-label right">GEL DENSITY · STABLE</div>
    <div class="bottom-ticks">
      <i v-for="n in 21" :key="n" :class="{ tall: n % 5 === 0 }" />
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 18px;
  z-index: 4;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border-color: rgba(102, 242, 255, 0.24);
  border-style: solid;
  border-width: 0;
}

.tl {
  top: 0;
  left: 0;
  border-top-width: 1px;
  border-left-width: 1px;
}

.tr {
  top: 0;
  right: 0;
  border-top-width: 1px;
  border-right-width: 1px;
}

.bl {
  bottom: 0;
  left: 0;
  border-bottom-width: 1px;
  border-left-width: 1px;
}

.br {
  bottom: 0;
  right: 0;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.side-label {
  position: absolute;
  font-size: 7px;
  letter-spacing: 0.3em;
  color: rgba(170, 215, 245, 0.3);
  white-space: nowrap;
}

.side-label.left {
  left: -2px;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg) translateX(50%);
  transform-origin: left center;
}

.side-label.right {
  right: -2px;
  bottom: 18%;
  transform: rotate(-90deg);
  transform-origin: right center;
}

.bottom-ticks {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  gap: 7px;
  align-items: flex-end;
  opacity: 0.5;
}

.bottom-ticks i {
  width: 1px;
  height: 3px;
  background: rgba(102, 242, 255, 0.35);
}

.bottom-ticks i.tall {
  height: 6px;
  background: rgba(102, 242, 255, 0.55);
  box-shadow: 0 0 6px rgba(102, 242, 255, 0.4);
}

@media (max-width: 1100px) {
  .side-label {
    display: none;
  }
}
</style>
