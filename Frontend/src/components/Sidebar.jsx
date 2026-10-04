import { useEffect, useState } from 'react'
import Logo from './Logo'

function isGroupActive(item, activePage) {
  return item.children?.some(c => c.key === activePage) ?? false
}

function groupBadge(item) {
  if (!item.children) return item.badge || 0
  return item.children.reduce((s, c) => s + (c.badge || 0), 0)
}

export default function Sidebar({ navItems, activePage, onNavigate, branding }) {
  const activeGroupKey = navItems.find(i => isGroupActive(i, activePage))?.key
  const [openGroups, setOpenGroups] = useState(activeGroupKey ? { [activeGroupKey]: true } : {})
  const [mobileGroup, setMobileGroup] = useState(null)

  useEffect(() => {
    if (activeGroupKey) {
      setOpenGroups(prev => ({ ...prev, [activeGroupKey]: true }))
    }
  }, [activeGroupKey])

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const itemBtnClass = (isActive) =>
    `flex w-full items-center gap-3 rounded px-4 py-2.5 text-left font-display text-base tracking-wide transition-all duration-150 ${
      isActive
        ? 'bg-primary text-white font-bold shadow-sm border-l-4 border-l-white'
        : 'text-on-surface-variant hover:bg-surface-light hover:text-primary'
    }`

  const renderChild = (child) => {
    const isActive = activePage === child.key
    return (
      <button
        key={child.key}
        onClick={() => onNavigate(child.key)}
        className={`flex w-full items-center gap-3 rounded px-4 py-2 pl-12 text-left font-display text-sm tracking-wide transition-all duration-150 ${
          isActive
            ? 'bg-primary/10 text-primary font-bold'
            : 'text-on-surface-variant hover:bg-surface-light hover:text-primary'
        }`}
      >
        <span className="material-symbols-outlined text-lg" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
          {child.icon}
        </span>
        <span>{child.label}</span>
        {child.badge > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8433D] px-1.5 font-display text-[10px] font-bold text-white">
            {child.badge}
          </span>
        )}
      </button>
    )
  }

  const renderItem = (item) => {
    if (!item.children) {
      const isActive = activePage === item.key
      return (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          className={itemBtnClass(isActive)}
        >
          <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
            {item.icon}
          </span>
          <span>{item.label}</span>
          {item.badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8433D] px-1.5 font-display text-[10px] font-bold text-white">
              {item.badge}
            </span>
          )}
        </button>
      )
    }

    const open = !!openGroups[item.key]
    const active = isGroupActive(item, activePage)
    const badge = groupBadge(item)
    return (
      <div key={item.key}>
        <button
          onClick={() => toggleGroup(item.key)}
          aria-expanded={open}
          className={itemBtnClass(active)}
        >
          <span className="material-symbols-outlined text-xl" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
            {item.icon}
          </span>
          <span>{item.label}</span>
          {badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8433D] px-1.5 font-display text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
          <span className={`material-symbols-outlined text-lg transition-transform duration-150 ${badge > 0 ? '' : 'ml-auto'} ${open ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {open && (
          <div className="mt-1 space-y-1">
            {item.children.map(renderChild)}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-[280px] flex-col border-r border-outline-variant bg-surface py-6 lg:flex">
        <div className="mb-8 px-6 border-b border-outline-variant/40 pb-5">
          <Logo size={40} branding={branding} />
        </div>

        <nav className="flex-1 space-y-1.5 px-3 overflow-y-auto">
          {navItems.map(renderItem)}
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
      <div className="lg:hidden">
        {mobileGroup && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileGroup(null)}
          />
        )}
        {mobileGroup && (
          <div className="fixed bottom-24 left-3 right-3 z-50 rounded-2xl border border-outline-variant bg-surface p-2 shadow-2xl">
            <p className="px-3 py-2 font-display text-xs uppercase tracking-widest text-on-surface-variant font-bold">
              {navItems.find(i => i.key === mobileGroup)?.label}
            </p>
            {navItems.find(i => i.key === mobileGroup)?.children?.map((child) => {
              const isActive = activePage === child.key
              return (
                <button
                  key={child.key}
                  onClick={() => { setMobileGroup(null); onNavigate(child.key) }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-display text-sm transition-colors ${
                    isActive ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface hover:bg-surface-light'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{child.icon}</span>
                  <span>{child.label}</span>
                  {child.badge > 0 && (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8433D] px-1 text-[9px] font-bold text-white">
                      {child.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t-2 border-outline-variant bg-surface shadow-2xl lg:hidden flex justify-around items-center px-2 safe-area-bottom">
          {navItems.map((item) => {
            if (item.children) {
              const active = isGroupActive(item, activePage)
              const open = mobileGroup === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setMobileGroup(open ? null : item.key)}
                  aria-expanded={open}
                  className={`flex flex-col items-center justify-center px-3 py-1.5 rounded transition-all duration-150 active:scale-95 relative ${
                    active
                      ? 'bg-primary text-white font-bold'
                      : 'text-on-surface-variant hover:bg-surface-light'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {item.icon}
                  </span>
                  <span className="font-display text-xs tracking-wider">{item.label}</span>
                  {groupBadge(item) > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8433D] px-1 text-[9px] font-bold text-white">
                      {groupBadge(item)}
                    </span>
                  )}
                </button>
              )
            }
            const isActive = activePage === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex flex-col items-center justify-center px-3 py-1.5 rounded transition-all duration-150 active:scale-95 relative ${
                  isActive
                    ? 'bg-primary text-white font-bold'
                    : 'text-on-surface-variant hover:bg-surface-light'
                }`}
              >
                <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span className="font-display text-xs tracking-wider">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8433D] px-1 text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
