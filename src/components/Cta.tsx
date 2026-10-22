import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Arrow } from './Brand'
import s from './Cta.module.css'

type Tone = 'ink' | 'alu'

/** Hauptaktion. Form des Bogens aus dem Signet: oben rund, unten gerade. */
export function ArchButton({ to, children, tone = 'ink', className }: { to: string; children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <Link to={to} className={`${s.arch} ${className ?? ''}`} data-tone={tone}>
      <span className={s.archLabel}>{children}</span>
      <Arrow className={s.archArrow} />
    </Link>
  )
}

/** Zweitaktion: Text mit Haarlinie, die sich beim Hover neu zieht. */
export function LineLink({ to, children, tone = 'ink', className }: { to: string; children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <Link to={to} className={`${s.line} ${className ?? ''}`} data-tone={tone}>
      <span>{children}</span>
      <Arrow className={s.lineArrow} />
    </Link>
  )
}
