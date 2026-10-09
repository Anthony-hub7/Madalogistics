import { useSyncExternalStore } from 'react'

/**
 * Preferences locales de l'utilisateur (hors compte) :
 * - notifs : 'toutes' | 'incidents' | 'silencieuse'
 * Store partage (useSyncExternalStore) pour que le Header et la modale
 * Parametres voient la meme valeur en temps reel.
 */
const STORAGE_KEY = 'madalogistix.preferences'

const DEFAULTS = { notifs: 'toutes' }

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

let state = typeof window === 'undefined' ? { ...DEFAULTS } : load()
const listeners = new Set()

export function getPreferences() {
  return state
}

export function setPreference(cle, valeur) {
  state = { ...state, [cle]: valeur }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // stockage indisponible (mode prive) : memoire seule
  }
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePreferences() {
  return useSyncExternalStore(subscribe, getPreferences, getPreferences)
}
