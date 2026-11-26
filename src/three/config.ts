export const SANDBOX = {
  size: 40,
  half: 20,
  height: 22,
  halfHeight: 11,
  waterY: 0,
  seabedDeep: -7.4,
  shellInset: 19.45,
  cornerRadius: 3,
} as const

export const PALETTE = {
  bgDeep: 0x02070f,
  bgMid: 0x061726,
  jellyDeep: 0x0a2f5e,
  jellyMid: 0x2f8fe0,
  jellyRim: 0x66f2ff,
  jellyViolet: 0xb48cff,
  waterDeep: 0x041b30,
  waterMid: 0x0a4f74,
  waterShallow: 0x2fb4c4,
  foam: 0xcdf7ff,
  sand: 0xdccb9a,
  sandWet: 0xb39a6a,
  seaSand: 0x8fa882,
  seaDeep: 0x173f52,
  grass: 0x45c07f,
  grassDeep: 0x23744c,
  grassLight: 0x6fdf9e,
  rock: 0x60748a,
  rockLight: 0x93a7ba,
  snow: 0xe8f7ff,
  trunk: 0x7a5540,
  crystal: 0x9fe9ff,
  lavender: 0xb48cff,
  warm: 0xffd08a,
  coral: 0xff8fb8,
  coralAlt: 0xffc58f,
} as const

export type ViewKey = 'overview' | 'land' | 'ocean' | 'underwater'

export interface ViewPreset {
  position: [number, number, number]
  target: [number, number, number]
  minDistance: number
  maxDistance: number
  label: string
}

export const VIEW_PRESETS: Record<ViewKey, ViewPreset> = {
  overview: {
    position: [38, 27, 38],
    target: [0, -1.0, 0],
    minDistance: 30,
    maxDistance: 100,
    label: '远景',
  },
  land: {
    position: [18, 12, 18],
    target: [-5.0, 3.4, -6.5],
    minDistance: 9,
    maxDistance: 60,
    label: '陆地',
  },
  ocean: {
    position: [27, 10, 25],
    target: [9.5, -1.5, 8.0],
    minDistance: 9,
    maxDistance: 65,
    label: '海洋',
  },
  underwater: {
    position: [0.5, -1.7, 17.5],
    target: [12.0, -3.4, 8.5],
    minDistance: 4,
    maxDistance: 26,
    label: '海底',
  },
}

export type SpeciesId = 'whale' | 'jellyfish'

export interface SpeciesInfo {
  id: SpeciesId
  name: string
  en: string
  tagline: string
  description: string
  tags: string[]
  accent: string
  metrics: { label: string; value: string }[]
}

export const SPECIES: Record<SpeciesId, SpeciesInfo> = {
  whale: {
    id: 'whale',
    name: '蓝鲸',
    en: 'Blue Whale',
    tagline: '海洋区域巡游者',
    description:
      '一只缓慢巡游的蓝鲸，是这片果冻海洋的视觉主体。它沿着固定的水域环线优雅滑行，身体随水流轻轻起伏，尾鳍有节奏地拍动。',
    tags: ['大型海洋生物', '滤食性', '果冻海域'],
    accent: '#66f2ff',
    metrics: [
      { label: '体长', value: '6.8 m' },
      { label: '深度', value: '-2.8 m' },
      { label: '巡游速度', value: '0.9 m/s' },
    ],
  },
  jellyfish: {
    id: 'jellyfish',
    name: '幻彩水母',
    en: 'Aurora Jelly',
    tagline: '果冻海域的发光精灵',
    description:
      '半透明的伞盖在蓝色与淡紫之间缓慢呼吸，触须随水流漂摆。它们漂浮在不同深度的水层中，是这片海域最柔和的光源。',
    tags: ['发光生物', '浮游', '软体'],
    accent: '#b48cff',
    metrics: [
      { label: '伞径', value: '0.9 m' },
      { label: '分布', value: '6 只' },
      { label: '深度', value: '-2 ~ -5 m' },
    ],
  },
}

export const QUALITY = {
  maxParticles: 10000,
  baseParticles: 5000,
  pixelRatioCap: 1.5,
  shadowMap: 1024,
} as const
