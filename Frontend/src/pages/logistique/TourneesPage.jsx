import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tourneesService } from '../../services/tourneesService'
import { sacsService } from '../../services/sacsService'

const STATUT_STYLES = {
  PLANIFIEE: 'bg-tertiary/10 text-tertiary border border-tertiary/30',
  EN_COURS: 'bg-primary/10 text-primary border border-primary/30',
  TERMINEE: 'bg-green-100 text-green-700 border border-green-200',
}

const FILTRES = [
  { key: '', label: 'Toutes' },
  { key: 'PLANIFIEE', label: 'Planifiées' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'TERMINEE', label: 'Terminées' },
]

export default function TourneesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tournees, setTournees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statut, setStatut] = useState('')
  const [hub, setHub] = useState('')
  const [recherche, setRecherche] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [succes, setSucces] = useState(null)

  const focusId = searchParams.get('tourneeId')

  const refresh = async () => {
    try {
      const res = await tourneesService.getAll()
      setTournees(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err.body?.error || err.message || 'Erreur de chargement')
    }
  }

  useEffect(() => {
    let cancelled = false
    tourneesService.getAll().then(
      (res) => { if (!cancelled) { setTournees(Array.isArray(res) ? res : []); setLoading(false) } },
      (err) => { if (!cancelled) { setError(err.body?.error || err.message || 'Erreur de chargement'); setLoading(false) } }
    )
    return () => { cancelled = true }
  }, [])

  const hubNoms = useMemo(() => {
    const set = new Set()
    tournees.forEach(t => { if (t.hub?.nom) set.add(t.hub.nom) })
    return [...set].sort()
  }, [tournees])

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return tournees.filter((t) => {
      if (statut && t.statut !== statut) return false
      if (hub && t.hub?.nom !== hub) return false
      if (!q) return true
      return String(t.tournee_id).toLowerCase().includes(q)
        || (t.hub?.nom || '').toLowerCase().includes(q)
    })
  }, [tournees, statut, hub, recherche])

  const selectionnee = useMemo(() => {
    if (!focusId) return null
    return tournees.find(t => String(t.tournee_id) === String(focusId)) || null
  }, [tournees, focusId])

  const selectionner = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('tourneeId', id)
    else next.delete('tourneeId')
    setSearchParams(next, { replace: true })
  }

  // ── Annulation du sac sur incident (tournée en cours : panne, route coupée) ──
  const handleAnnulerIncident = async () => {
    if (!selectionnee?.sac_id) return
    const motif = window.prompt(
      'Annuler ce sac suite à un incident ?\n\n' +
      'Le sac passera ANNULÉ, ses colis seront libérés et repartiront ' +
      'en attente de groupage. Les clients seront notifiés.\n\nMotif :'
    )
    if (motif === null) return
    setActionLoading(true)
    setError(null)
    setSucces(null)
    try {
      const res = await sacsService.annulerIncident(selectionnee.sac_id, { motif })
      setSucces(`${res.colisLiberes} colis libérés, ${res.demandesRetournees} commandes remises en groupage.`)
      await refresh()
    } catch (e) {
      setError(e.body?.message || e.body?.error || e.message || "Erreur lors de l'annulation")
    } finally {
      setActionLoading(false)
    }
  }

  const livraisons = (selectionnee?.etapes || []).filter(e => e.type_etape === 'LIVRAISON')
  const collectes = (selectionnee?.etapes || []).filter(e => e.type_etape === 'COLLECTE')

  return (
    <div className="space-y-6">
      <div className="border-b border-outline-variant/60 pb-5">
        <div className="flex items-center gap-3">
          <span className="font-stamp text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">LOGISTIQUE</span>
        </div>
        <h2 className="font-display text-3xl font-bold text-on-surface uppercase tracking-tight mt-1">Tournées</h2>
        <p className="font-body text-sm text-on-surface-variant">
          Toutes les tournées planifiées, en cours et terminées — sélectionnez-en une pour voir ses étapes et sa carte.
        </p>
      </div>

      {succes && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-green-600 mt-0.5">check_circle</span>
          <div className="flex-1"><p className="text-sm text-green-800">{succes}</p></div>
          <button onClick={() => setSucces(null)} className="text-green-400 hover:text-green-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div className="flex-1"><p className="text-sm text-red-800">{error}</p></div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

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
        <select
          value={hub}
          onChange={(e) => setHub(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface"
        >
          <option value="">Tous les hubs</option>
          {hubNoms.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2">
            <span className="material-symbols-outlined text-outline text-lg">search</span>
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="N° tournée, hub…"
              className="w-full bg-transparent font-body text-sm text-on-surface outline-none placeholder:text-outline"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Liste */}
        <div className="waybill-card overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-outline-variant bg-surface-light px-6 py-4">
            <span className="material-symbols-outlined text-primary">route</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
              Tournées <span className="text-on-surface-variant font-normal">({filtrees.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/40 max-h-[560px] overflow-y-auto">
            {loading ? (
              <div className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Chargement…</div>
            ) : filtrees.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <span className="material-symbols-outlined text-4xl text-outline">route</span>
                <p className="font-body text-sm text-on-surface-variant mt-2">Aucune tournée. Planifiez-en une depuis la page Sacs ou Optimisation.</p>
              </div>
            ) : (
              filtrees.map((t) => {
                const actif = String(focusId) === String(t.tournee_id)
                const nbLiv = (t.etapes || []).filter(e => e.type_etape === 'LIVRAISON').length
                return (
                  <button
                    key={t.tournee_id}
                    onClick={() => selectionner(actif ? null : t.tournee_id)}
                    className={`w-full text-left px-6 py-4 transition-colors cursor-pointer ${
                      actif ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-surface-light/70 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-on-surface">
                        Tournée {String(t.tournee_id).slice(0, 8)}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUT_STYLES[t.statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}>
                        {t.statut}
                      </span>
                    </div>
                    <p className="font-body text-xs text-on-surface-variant mt-1">
                      {t.hub?.nom || '—'} · {nbLiv} livraison{nbLiv > 1 ? 's' : ''}
                      {t.distance_totale_km != null && <> · {Number(t.distance_totale_km).toFixed(1)} km</>}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Détail */}
        <div className="waybill-card overflow-hidden lg:col-span-3">
          {!selectionnee ? (
            <div className="px-6 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline">map</span>
              <p className="font-body text-sm text-on-surface-variant mt-3">Sélectionnez une tournée pour voir ses étapes et sa carte.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">route</span>
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
                      Tournée {String(selectionnee.tournee_id).slice(0, 8)}
                    </h3>
                    <p className="font-mono text-[11px] text-on-surface-variant">
                      {selectionnee.hub?.nom || '—'}
                      {selectionnee.distance_totale_km != null && <> · {Number(selectionnee.distance_totale_km).toFixed(1)} km</>}
                    </p>
                  </div>
                </div>
                <span className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase ${STATUT_STYLES[selectionnee.statut] || ''}`}>
                  {selectionnee.statut}
                </span>
              </div>

              {selectionnee.statut === 'EN_COURS' && selectionnee.sac_id && (
                <div className="m-4 mb-0 rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-600">warning</span>
                  <p className="font-body text-xs text-amber-800 flex-1">
                    Incident sur la route (panne, route coupée) ? Annulez le sac : les colis seront libérés.
                  </p>
                  <button
                    onClick={handleAnnulerIncident}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-lg bg-amber-500 text-white font-display text-xs font-bold uppercase tracking-wider hover:bg-amber-600 disabled:opacity-40 cursor-pointer">
                    {actionLoading ? 'Annulation…' : 'Annuler le sac'}
                  </button>
                </div>
              )}

              <div className="rounded-xl overflow-hidden border border-outline-variant m-4" style={{ height: '320px' }}>
                <iframe
                  src={`/logistics/carte_optimisation?tourneeId=${selectionnee.tournee_id}&embed=1`}
                  className="w-full h-full border-0"
                  title={`Carte tournée ${String(selectionnee.tournee_id).slice(0, 8)}`}
                />
              </div>

              <div className="px-6 pb-6 space-y-4">
                {collectes.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                      Collectes ({collectes.length})
                    </h4>
                    {collectes.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-4 py-2">
                        <span className="material-symbols-outlined text-green-600 text-lg">inventory_2</span>
                        <span className="font-body text-xs text-on-surface flex-1 truncate">
                          {e.adresse_collecte || `Colis ${String(e.colis_id || '').slice(0, 8)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                    Livraisons ({livraisons.length})
                  </h4>
                  {livraisons.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">Aucune étape de livraison.</p>
                  ) : (
                    livraisons.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-outline-variant px-4 py-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                          {e.ordre || i + 1}
                        </span>
                        <span className="font-mono text-xs font-bold text-on-surface">{String(e.colis_id || '').slice(0, 8)}</span>
                        <span className="font-body text-xs text-on-surface-variant flex-1">Colis {String(e.colis_id || '').slice(0, 8)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
