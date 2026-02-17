'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const Beams = dynamic(() => import('./Beams'), { ssr: false })

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const handler = () => setReduced(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return reduced
}

/** Full-screen beam animation layer. Parent should be `relative`. */
export function BeamsBackground() {
  const isMobile = useReducedMotion()
  return (
    <div className="absolute inset-0 min-h-[100dvh]">
      <Beams
        beamWidth={isMobile ? 2.5 : 3}
        beamHeight={isMobile ? 24 : 30}
        beamNumber={isMobile ? 10 : 20}
        heightSegments={isMobile ? 50 : 100}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        lightColor="#ffffff"
        speed={2}
        noiseIntensity={1.75}
        scale={0.2}
        rotation={30}
      />
    </div>
  )
}
