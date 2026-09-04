import Logo from './Logo'

export default function Sidebar({ navItems, activePage, onNavigate, branding }) {
  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-[280px] flex-col border-r border-outline-variant bg-surface py-6 lg:flex">
        <div className="mb-8 px-6 border-b border-outline-variant/40 pb-5">
          <Logo size={40} branding={branding} />
        </div>

        <nav className="flex-1 space-y-1.5 px-3">
          {navItems.map((item) => {
            const isActive = activePage === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-3 rounded px-4 py-2.5 text-left font-display text-base tracking-wide transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-sm border-l-4 border-l-white'
                    : 'text-on-surface-variant hover:bg-surface-light hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-outline-variant/60 px-3 pt-4 space-y-1">
          <button className="flex w-full items-center gap-3 rounded px-4 py-2 text-left font-display text-sm text-on-surface-variant transition-colors hover:bg-surface-light hover:text-primary">
            <span className="material-symbols-outlined text-lg">support_agent</span>
            <span>Support</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded px-4 py-2 text-left font-display text-sm text-on-surface-variant transition-colors hover:bg-surface-light hover:text-primary">
            <span className="material-symbols-outlined text-lg">settings</span>
            <span>Paramètres</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation (< lg) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t-2 border-outline-variant bg-surface shadow-2xl lg:hidden flex justify-around items-center px-2 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = activePage === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-primary text-white font-bold'
                  : 'text-on-surface-variant hover:bg-surface-light'
              }`}
            >
              <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className="font-display text-xs tracking-wider">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
