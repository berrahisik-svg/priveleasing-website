import { createContext, useContext } from 'react'

/**
 * „Bühne“: sagt Seiten, wann sie ihren Auftritt beginnen dürfen,
 * also nach dem Intro bzw. wenn der Vorhang des Seitenwechsels aufgeht.
 */
export const StageCtx = createContext(false)

export function useStageReady() {
  return useContext(StageCtx)
}
