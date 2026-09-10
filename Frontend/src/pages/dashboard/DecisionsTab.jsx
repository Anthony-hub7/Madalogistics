import { useState, useEffect } from 'react'
import { decisionsService } from '../../services/decisionsService'
import { hubsService } from '../../services/hubsService'

const typeColors = {
  KNAPSACK: 'bg-primary/10 text-primary',
  BIN_PACKING: 'bg-tertiary/10 text-tertiary',
  AFFECTATION: 'bg-secondary/10 text-secondary',
  VRP: 'bg-error/10 text-error',
}

function formatDuration(ms) {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DecisionsTab() {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hubs, setHubs] = useState([])
  const [hubFilter, setHubFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    hubsService.lister()
      .then(data => setHubs(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = {}
    if (hubFilter) params.hubId = hubFilter
    if (typeFilter) params.type = typeFilter

    decisionsService.lister(params)
      .then(data => setDecisions(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [hubFilter, typeFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={hubFilter}
          onChange={(e) => setHubFilter(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tous les hubs</option>
          {hubs.map(h => (
            <option key={h.hubId} value={h.hubId}>{h.nom}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tous les types</option>
          <option value="KNAPSACK">Knapsack</option>
          <option value="BIN_PACKING">Bin Packing</option>
          <option value="AFFECTATION">Affectation</option>
          <option value="VRP">VRP</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant p-5">
          <h3 className="font-headline-md text-headline-md text-on-surface">Exécutions d'optimisation</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-error font-body-md text-body-md">{error}</div>
        ) : decisions.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl opacity-30">insights</span>
            <p className="font-body-md text-body-md mt-2">Aucune exécution d'optimisation</p>
            <p className="font-label-sm text-label-sm text-outline mt-1">Les runs apparaîtront ici après exécution des algorithmes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Date</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Type</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Hub</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Justification</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {decisions.map((d) => (
                  <tr key={d.runId} className="transition-colors hover:bg-surface-container-low/50">
                    <td className="px-5 py-4 font-label-md text-label-md text-on-surface">{formatDate(d.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded px-2 py-1 text-[11px] font-bold uppercase ${typeColors[d.typeAlgorithme] || 'bg-surface-container-highest text-on-surface'}`}>
                        {d.typeAlgorithme}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-body-sm text-body-sm text-on-surface-variant">{d.hubNom || '-'}</td>
                    <td className="px-5 py-4 font-body-sm text-body-sm text-on-surface-variant max-w-xs truncate">{d.justificationDocument || '-'}</td>
                    <td className="px-5 py-4 font-label-md text-label-md text-on-surface-variant">{formatDuration(d.dureeCalculMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
