export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  expo: [0.16, 1, 0.3, 1] as const,
  in: [0.7, 0, 0.84, 0] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  /* Tür: schwer anlaufend, weich auslaufend */
  door: [0.76, 0, 0.24, 1] as const,
}

export const introKey = 'prive:intro'
