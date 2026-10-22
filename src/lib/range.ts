import { useTransform, type MotionValue } from 'motion/react'

/**
 * Wie useTransform mit Bereichen, aber immer als Funktion: Motion würde Opacity
 * sonst an eine native ViewTimeline hängen, deren Bereich nicht zu unseren
 * Offsets passt.
 */
export function useRange(p: MotionValue<number>, [a, b]: [number, number], [x, y]: [number, number], unit = '') {
  return useTransform(p, (v) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
    const out = x + (y - x) * t
    return unit ? `${out}${unit}` : out
  })
}
