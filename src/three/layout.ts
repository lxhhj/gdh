export type Pt2 = [number, number]

/** 小路：从小屋出发，穿过山脚草地与溪流，抵达沙滩栈道 */
export const PATH_PTS: Pt2[] = [
  [11.6, -15.5],
  [10.4, -13.9],
  [9.5, -12.6],
  [8.5, -9.6],
  [7.1, -6.2],
  [5.4, -2.6],
  [3.7, 0.0],
  [2.5, 0.9],
]

/** 溪流：从山脚湖泊流出，向东南汇入果冻海 */
export const STREAM_PTS: Pt2[] = [
  [7.0, -15.4],
  [8.2, -15.2],
  [9.2, -13.6],
  [9.6, -12.5],
  [10.0, -10.6],
  [10.4, -9.0],
  [11.2, -5.5],
  [12.4, -2.0],
  [13.6, 1.6],
  [14.4, 4.6],
]

export const BOARDWALK = {
  start: [2.5, 0.9] as Pt2,
  end: [6.8, 4.6] as Pt2,
  deckY: 0.8,
  width: 1.6,
}

export const BRIDGE = {
  center: [9.5, -12.4] as Pt2,
  width: 2.4,
  length: 3.0,
}

export const CABIN_POS: Pt2 = [11.0, -16.5]

export function distancePointSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  let t = len2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const cx = ax + dx * t
  const cz = az + dz * t
  return Math.hypot(px - cx, pz - cz)
}

export function polylineDistance(px: number, pz: number, pts: Pt2[]): number {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distancePointSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
    if (d < best) best = d
  }
  return best
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

/** 采样 2D Catmull-Rom 折线，t ∈ [0,1] */
export function samplePolyline(pts: Pt2[], t: number): Pt2 {
  const clamped = t <= 0 ? 0 : t >= 1 ? 0.99999 : t
  const total = pts.length - 1
  const f = clamped * total
  const i = Math.min(Math.floor(f), total - 1)
  const local = f - i
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(total, i + 2)]
  return [catmull(p0[0], p1[0], p2[0], p3[0], local), catmull(p0[1], p1[1], p2[1], p3[1], local)]
}
