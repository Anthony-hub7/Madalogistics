export default function SourceBadge({ source, compact = false }) {
  const isOsrm = source === 'OSRM'

  const color = isOsrm
    ? { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' }
    : { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' }

  const label = isOsrm ? 'OSRM' : 'Estime'

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
