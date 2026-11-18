'use client'

import { useEffect, useState } from 'react'

const NEW_ORIGIN = 'https://presentismo.virreyesrugbyclub.com'

/**
 * Non-blocking notice shown only when the app is opened from the old
 * *.vercel.app address (e.g. a PWA installed before the domain change).
 * The app keeps working underneath; the user can dismiss it until next open.
 */
export function DomainMovedBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(window.location.hostname.endsWith('.vercel.app'))
  }, [])

  if (!show) return null

  return (
    <div className="relative z-50 bg-vrc-gold text-gray-900 px-4 py-2.5 text-sm flex items-start gap-3">
      <div className="flex-1 leading-snug">
        <p className="font-semibold">La app se mudó a una nueva dirección</p>
        <p className="text-xs mt-0.5">
          Para que no deje de funcionar, borrá este ícono y volvé a instalarla desde{' '}
          <a href={NEW_ORIGIN} className="underline font-semibold">
            presentismo.virreyesrugbyclub.com
          </a>
          . Mientras tanto podés seguir usándola normalmente.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Cerrar aviso"
        className="text-gray-700 hover:text-black text-lg leading-none px-1"
      >
        ×
      </button>
    </div>
  )
}
