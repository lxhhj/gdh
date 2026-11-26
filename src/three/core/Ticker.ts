export class Ticker {
  elapsed = 0
  delta = 0
  paused = false
  private last = performance.now()

  update(): void {
    const now = performance.now()
    let dt = (now - this.last) / 1000
    this.last = now
    if (!Number.isFinite(dt) || dt < 0) dt = 0
    dt = Math.min(dt, 1 / 20)
    this.delta = this.paused ? 0 : dt
    this.elapsed += this.delta
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    this.last = performance.now()
  }
}
