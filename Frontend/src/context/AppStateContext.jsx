import { createContext, useContext } from 'react'

export const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  return (
    <AppStateContext.Provider value={{}}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
