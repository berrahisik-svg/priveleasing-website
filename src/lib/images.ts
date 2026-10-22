import manifest from '../imageManifest.json'

export type ImageName = keyof typeof manifest

type Entry = { width: number; height: number; widths: number[]; lqip: string }

export function image(name: ImageName) {
  const m = manifest[name] as Entry
  const set = (ext: string) => m.widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ')
  return {
    width: m.width,
    height: m.height,
    lqip: m.lqip,
    avif: set('avif'),
    webp: set('webp'),
    jpg: set('jpg'),
    src: `/img/${name}-${m.widths.includes(1600) ? 1600 : m.widths[m.widths.length - 1]}.jpg`,
  }
}
