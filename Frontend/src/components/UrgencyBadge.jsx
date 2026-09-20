import { useMemo } from 'react'

const COLORS = {
  forced: { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  urgent: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  normal: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  none: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
}

export default function UrgencyBadge({ dateDepartCalculee, departForce, compact = false }) {
  const urgency = useMemo(() => {
    if (!dateDepartCalculee) return { label: '—', level: 'none', color: COLORS.none }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateDepartCalculee)
    target.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24))

    if (departForce || diffDays <= 0) {
      return { label: diffDays <= 0 ? 'DEPART FORCE' : `J-${diffDays}`, level: 'forced', color: COLORS.forced }
    }
    if (diffDays <= 2) {
      return { label: `J-${diffDays}`, level: 'urgent', color: COLORS.urgent }
    }
    return { label: `J-${diffDays}`, level: 'normal', color: COLORS.normal }
  }, [dateDepartCalculee, departForce])

  const { label, color } = urgency

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.dot }} />
        {label}
      </span>
    )
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.dot }} />
      {label}
    </div>
  )
}
