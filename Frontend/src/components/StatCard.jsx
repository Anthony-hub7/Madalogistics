export default function StatCard({ label, value, trend, icon, iconBg, trendColor, sub, children }) {
  return (
    <div className="waybill-card flex flex-col justify-between p-5 border-l-4 border-l-primary relative overflow-hidden transition-all duration-200 hover:border-primary">
      {/* Background gauge line texture accent */}
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      <div className="mb-3 flex items-start justify-between relative z-10">
        {icon && (
          <div className={`rounded-md p-2.5 border border-outline-variant/40 ${iconBg || 'bg-surface-light text-primary'}`}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        )}
        {trend && (
          <span className={`font-display text-sm font-bold tracking-wide px-2 py-0.5 rounded border border-outline-variant/30 ${trendColor || 'text-on-surface-variant'}`}>{trend}</span>
        )}
      </div>
      <div className="relative z-10">
        <p className="font-display text-xs uppercase tracking-widest font-semibold text-on-surface-variant">{label}</p>
        <p className="font-display text-3xl font-bold mt-1 text-on-surface tabular-nums tracking-tight">{value}</p>
        {sub && <p className="font-body text-xs text-on-surface-variant mt-0.5">{sub}</p>}
        {children}
      </div>
    </div>
  )
}
