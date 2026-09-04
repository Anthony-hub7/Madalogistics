export default function StatusBadge({ label, bg, dotColor }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border-2 px-2.5 py-0.5 font-stamp text-xs font-bold uppercase tracking-wider shadow-sm transition-transform hover:scale-105 ${bg || 'border-primary text-primary bg-primary/10'}`}>
      {dotColor && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      <span className="relative z-10">{label}</span>
    </span>
  )
}