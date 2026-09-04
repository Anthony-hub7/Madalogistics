import { useState, useRef, useEffect } from 'react'

export default function Header({ searchPlaceholder, user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  return (
    <header className="fixed right-0 top-0 z-30 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface/90 px-4 backdrop-blur-md lg:w-[calc(100%-280px)] lg:px-8">
      {/* Search Input with industrial input styling */}
      <div className="relative ml-auto max-w-md flex-1 lg:ml-0">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
        <input
          className="w-full rounded border border-outline-variant bg-surface-low py-1.5 pl-10 pr-4 font-body text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={searchPlaceholder || 'Rechercher bordereau, lot, camion...'}
          type="text"
        />
      </div>

      {/* Corridor Axis Tag Accent (Purely decorative visual element, non-disruptive) */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-surface-light border border-outline-variant/60 rounded text-xs font-display tracking-wider text-on-surface-variant">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="font-bold text-primary">RN7</span>
        <span className="opacity-60 font-mono">TANA ➔ ANTSIRABE</span>
      </div>

      <div className="ml-4 flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <button className="relative rounded border border-outline-variant/40 p-2 text-on-surface-variant transition-colors hover:bg-surface-light hover:text-primary">
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
          <button className="rounded border border-outline-variant/40 p-2 text-on-surface-variant transition-colors hover:bg-surface-light hover:text-primary">
            <span className="material-symbols-outlined text-xl">help</span>
          </button>
        </div>
        <div className="hidden h-8 w-px bg-outline-variant sm:block" />
        <div ref={dropdownRef} className="relative flex items-center gap-3 pl-2 sm:pl-0">
          <div className="hidden text-right lg:block">
            <p className="font-display text-sm font-bold tracking-wide text-on-surface">{user?.name || 'Utilisateur'}</p>
            <p className="font-body text-xs text-on-surface-variant">{user?.title || ''}</p>
          </div>
          <button
            onClick={() => { console.log('HEADER - dropdown toggle, current state:', dropdownOpen); setDropdownOpen(!dropdownOpen) }}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded border-2 border-primary bg-primary/10 font-display text-sm font-bold text-primary transition-transform hover:scale-105"
          >
            {user?.initials || 'U'}
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded border-2 border-outline-variant bg-surface shadow-xl">
                <div className="border-b border-outline-variant bg-surface-light px-4 py-3">
                  <p className="font-display text-sm font-bold text-on-surface">{user?.name || 'Utilisateur'}</p>
                  <p className="font-body text-xs text-on-surface-variant">{user?.title || ''}</p>
                </div>
                <div className="py-1">
                  <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-light">
                    <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    Profil
                  </button>
                  <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-light">
                    <span className="material-symbols-outlined text-on-surface-variant">settings</span>
                    Paramètres
                  </button>
                </div>
                {onLogout && (
                  <div className="border-t border-outline-variant py-1">
                    <button
                      onClick={() => { console.log('HEADER - logout button clicked'); onLogout() }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <span className="material-symbols-outlined">logout</span>
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
