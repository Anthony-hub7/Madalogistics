import { useEffect, useState } from 'react'
import { apiClient } from '../services/apiClient'

/**
 * Photo de preuve de livraison, chargee avec le Bearer token (fetch → blob).
 * <img src> direct ne transmet pas le header Authorization d'où ce composant.
 */
export default function PhotoPreuve({ demandeId, etapeId, alt = 'Preuve de livraison', className = '' }) {
  const [src, setSrc] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    if (!demandeId || !etapeId) {
      setState('error')
      return
    }
    let cancelled = false
    let objectUrl = null

    async function load() {
      setState('loading')
      try {
        const blob = await apiClient.blob(`/demandes/${demandeId}/preuves/${etapeId}/photo`)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    }
    load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [demandeId, etapeId])

  if (state === 'error') {
    return (
      <div className={`flex items-center justify-center bg-surface-container-high text-on-surface-variant ${className}`}>
        <div className="text-center">
          <span className="material-symbols-outlined text-2xl">photo_camera</span>
          <p className="font-label-sm text-label-sm">Aucune photo</p>
        </div>
      </div>
    )
  }

  if (state === 'loading' || !src) {
    return (
      <div className={`flex items-center justify-center bg-surface-container-high ${className}`}>
        <span className="material-symbols-outlined animate-spin text-outline">progress_activity</span>
      </div>
    )
  }

  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
}
