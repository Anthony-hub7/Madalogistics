import { useEffect, useMemo, useState } from 'react'
import { sacsService } from '../../services/sacsService'
import SacDetailModal from '../../components/SacDetailModal'

const SAC_STATUT_STYLES = {
  CONSTITUE: 'bg-outline-variant/30 text-on-surface-variant border border-outline-variant',
  AFFECTE: 'bg-tertiary/10 text-tertiary border border-tertiary/30',
  EN_TRANSIT: 'bg-primary/10 text-primary border border-primary/30',
  LIVRE: 'bg-green-100 text-green-700 border border-green-200',
}

const FILTRES = [
  { key: '', label: 'Tous' },
  { key: 'LIVRE', label: 'Livrés' },
  { key: 'EN_TRANSIT', label: 'En transit' },
  { key: 'AFFECTE', label: 'Affectés' },
  { key: 'CONSTITUE', label: 'Constitués' },
]

export default function SacsTab() {
  const [sacs, setSacs] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statut, setStatut] = useState('')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState(null)

  useEffect(() => {
    let cancelled = false
    sacsService.getAll().then(
      (res) => { if (!cancelled) { setSacs(res || []); setLoading(false) } },
      (err) => { if (!cancelled) { setErreur(err.message || 'Erreur de chargement'); setLoading(false) } }
    )
    return () => { cancelled = true }
  }, [])

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return sacs.filter((s) => {
      if (statut && s.statut !== statut) return false
      if (!q) return true
      return (s.chauffeurNom || '').toLowerCase().includes(q)
        || (s.hubNom || '').toLowerCase().includes(q)
        || (s.immatriculation || '').toLowerCase().includes(q)
        || String(s.sacId).toLowerCase().includes(q)
    })
  }, [sacs, statut, recherche])

  return (
    <div className="space-y-4">
      <div className="waybill-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTRES.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatut(f.key)}
              className={`px-3 py-1.5 rounded-full border font-display text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors ${
                statut === f.key
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2">
            <span className="material-symbols-outlined text-outline text-lg">search</span>
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chauffeur, hub, plaque, n° sac…"
              className="w-full bg-transparent font-body text-sm text-on-surface outline-none placeholder:text-outline"
            />
          </div>
        </div>
      </div>

      <div className="waybill-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
              Sacs <span className="text-on-surface-variant font-normal">({filtrees.length})</span>
            </h3>
          </div>
          <span className="font-mono text-[10px] text-on-surface-variant">Cliquez sur un sac pour le détail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Sac</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Hub</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Chauffeur</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Colis</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Remplissage</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Chargement…</td></tr>
              ) : erreur ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center font-body text-sm text-error">{erreur}</td></tr>
              ) : filtrees.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Aucun sac ne correspond aux filtres.</td></tr>
              ) : (
                filtrees.map((s) => (
                  <tr key={s.sacId}
                      className="transition-colors hover:bg-surface-light/70 cursor-pointer"
                      onClick={() => setSelection(s.sacId)}>
                    <td className="px-6 py-4 font-mono font-bold text-sm text-on-surface">{String(s.sacId).slice(0, 8)}</td>
                    <td className="px-6 py-4 font-body text-sm text-on-surface">{s.hubNom || '—'}</td>
                    <td className="px-6 py-4 font-body text-sm font-medium text-on-surface">{s.chauffeurNom || '—'}</td>
                    <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">{s.nbColis} · {s.poidsKg} kg</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-outline-variant/50 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round(s.tauxRemplissage || 0))}%` }} />
                        </div>
                        <span className="font-mono text-xs text-on-surface-variant">{Math.round(s.tauxRemplissage || 0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${SAC_STATUT_STYLES[s.statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}>
                        {s.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selection && <SacDetailModal sacId={selection} onClose={() => setSelection(null)} />}
    </div>
  )
}
