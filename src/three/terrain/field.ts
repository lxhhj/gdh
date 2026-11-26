import { Simplex2D } from '../core/Noise'
import { lerp, smoothstep, clamp } from '../core/math'

const noise = new Simplex2D(20261126)

export const MOUNTAIN = { x: -8, z: -8, peak: 7.8, radius: 9.3 }
export const SECONDARY_HILL = { x: -16, z: -1.5, peak: 2.7, radius: 4.9 }
export const LAKE = { x: 5.2, z: -15.2, radius: 2.9, level: 1.22 }
export const UNDERWATER_HILL = { x: 11, z: 12, peak: 3.6, radius: 4.6 }
export const CABIN_PAD = { x: 11.0, z: -16.5, radius: 2.8, height: 0 }

export function coastLine(x: number, z: number): number {
  const perp = (x - z) * 0.70710678
  return 2.0 + Math.sin(perp * 0.19 + 0.7) * 1.5 + noise.fbm(perp * 0.055, 5.2, 3) * 2.4
}

function baseHeight(x: number, z: number): number {
  const d = (x + z) * 0.70710678
  const coast = coastLine(x, z)
  const t = smoothstep(coast - 2.4, coast + 2.6, d)

  // ---- land ----
  const mr = Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z)
  const ridge = 0.78 + 0.42 * noise.ridged(x * 0.07 + 3.1, z * 0.07 - 1.7, 4)
  const mountain = MOUNTAIN.peak * Math.exp(-Math.pow(mr / MOUNTAIN.radius, 2.05)) * ridge
  const hill =
    SECONDARY_HILL.peak *
    Math.exp(-Math.pow(Math.hypot(x - SECONDARY_HILL.x, z - SECONDARY_HILL.z) / SECONDARY_HILL.radius, 2))
  const hills = noise.fbm(x * 0.055 + 11.3, z * 0.055 - 4.7, 4) * 1.05
  const detail = noise.fbm(x * 0.17, z * 0.17, 3) * 0.28

  let land = 1.7 + mountain + hill + hills + detail
  const beach = smoothstep(coast - 3.0, coast + 0.8, d)
  land = lerp(land, 0.42 + detail * 0.25, beach * 0.72)

  // ---- sea ----
  const dw = Math.max(0, d - coast)
  const basin = -1.5 - 5.2 * smoothstep(0, 12.5, dw)
  const seaNoise =
    noise.fbm(x * 0.095 - 3.3, z * 0.095 + 8.1, 4) * 0.85 + noise.fbm(x * 0.24, z * 0.24, 2) * 0.16
  const reef =
    UNDERWATER_HILL.peak *
    Math.exp(-Math.pow(Math.hypot(x - UNDERWATER_HILL.x, z - UNDERWATER_HILL.z) / UNDERWATER_HILL.radius, 2))

  let sea = basin + seaNoise + reef
  sea = Math.min(sea, -0.6)

  return lerp(land, sea, t)
}

CABIN_PAD.height = baseHeight(CABIN_PAD.x, CABIN_PAD.z)

export function terrainHeight(x: number, z: number): number {
  let h = baseHeight(x, z)

  // 山脚湖泊：湖盆 + 围岸
  const lr = Math.hypot(x - LAKE.x, z - LAKE.z)
  if (lr < 5.4) {
    const inside = smoothstep(LAKE.radius + 0.5, LAKE.radius - 1.3, lr)
    const bowl = LAKE.level - 0.72 - 0.22 * smoothstep(LAKE.radius, 0, lr)
    h = lerp(h, bowl, inside)
    const rimBand = smoothstep(LAKE.radius + 0.15, LAKE.radius + 0.95, lr) * smoothstep(5.2, 4.0, lr)
    h = lerp(h, Math.max(h, LAKE.level + 0.38), rimBand * 0.9)
  }

  // 小屋地基：局部平整
  const cr = Math.hypot(x - CABIN_PAD.x, z - CABIN_PAD.z)
  if (cr < CABIN_PAD.radius + 2.4) {
    const w = smoothstep(CABIN_PAD.radius + 2.4, CABIN_PAD.radius - 0.5, cr)
    h = lerp(h, CABIN_PAD.height, w)
  }

  return h
}

export function waterDepth(x: number, z: number): number {
  return Math.max(0, -terrainHeight(x, z))
}

export function isLand(x: number, z: number): boolean {
  return terrainHeight(x, z) > 0.35
}

export function terrainSlope(x: number, z: number): number {
  const e = 0.35
  const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z)
  const hz = terrainHeight(x, z + e) - terrainHeight(x, z - e)
  const n = Math.hypot(hx, 2 * e, hz)
  return 1 - (2 * e) / n
}

export function mountainFactor(x: number, z: number): number {
  const mr = Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z)
  return clamp(1 - mr / (MOUNTAIN.radius * 1.35), 0, 1)
}
