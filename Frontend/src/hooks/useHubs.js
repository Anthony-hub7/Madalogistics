import { useState, useEffect, useCallback } from 'react'
import { hubsService } from '../services/hubsService'

export function useHubs() {
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHubs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await hubsService.lister()
      setHubs(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHubs()
  }, [fetchHubs])

  const creerHub = async (formData) => {
    const hub = await hubsService.creer(formData)
    setHubs(prev => [...prev, hub])
    return hub
  }

  const modifierHub = async (hubId, formData) => {
    const hub = await hubsService.modifier(hubId, formData)
    setHubs(prev => prev.map(h => h.hubId === hubId ? hub : h))
    return hub
  }

  const supprimerHub = async (hubId) => {
    await hubsService.supprimer(hubId)
    setHubs(prev => prev.filter(h => h.hubId !== hubId))
  }

  const toggleActifHub = async (hubId) => {
    const hub = await hubsService.toggleActif(hubId)
    setHubs(prev => prev.map(h => h.hubId === hubId ? hub : h))
    return hub
  }

  return {
    hubs,
    loading,
    error,
    fetchHubs,
    creerHub,
    modifierHub,
    supprimerHub,
    toggleActifHub,
  }
}
