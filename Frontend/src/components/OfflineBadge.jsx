import { useOffline } from '../hooks/useOffline'

export default function OfflineBadge() {
  const online = useOffline()
  if (online) return null
  return (
    <div className="absolute top-2 right-2 z-[1000] bg-amber-500/90 text-on-error rounded-lg px-3 py-1.5 text-xs font-bold shadow-md pointer-events-none">
      Hors ligne — tuiles en cache, création différée
    </div>
  )
}
