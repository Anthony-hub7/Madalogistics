import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { gainsService } from '../../services/gainsService'
import { hubsService } from '../../services/hubsService'
import StatCard from '../../components/StatCard'

const COULEUR_BASELINE = '#94a3b8'
const COULEUR_OPTIMISE = '#e8433d'

const PARAMS_DEFAUT = {
  vitesseKmh: 40,
  consoL100km: 8,
  prixFuelArParL: 5900,
  facteurCo2KgParL: 2.68,
  coutHoraireAr: 0,
}

const nf = (n, max = 1) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: max })
const fmtAr = (n) => (n == null ? '—' : `${Math.round(Number(n)).toLocaleString('fr-FR')} Ar`)
const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(1)} %`)

export default function GainsDirectionPage() {
  const [hubs, setHubs] = useState([])
  const [hubId, setHubId] = useState('')
  const [form, setForm] = useState(PARAMS_DEFAUT)
  const [params, setParams] = useState(PARAMS_DEFAUT)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    hubsService.lister().then(
      (res) => { if (!cancelled) setHubs(res || []) },
      () => {}
    )
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await gainsService.comparer({
          hubId: hubId || undefined,
          ...params,
        })
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Erreur de calcul')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [hubId, params])

  const appliquerParams = () => {
    const clean = {}
    for (const [k, v] of Object.entries(form)) {
      const n = Number(v)
      clean[k] = Number.isFinite(n) ? n : PARAMS_DEFAUT[k]
    }
    setParams(clean)
  }

  const b = data?.baseline
  const o = data?.optimise
  const g = data?.gains
  const p = data?.perimetre

  const cartes = [
    {
      label: 'Économie estimée',
      value: loading ? '…' : fmtAr(g?.coutAr),
      icon: 'payments',
      iconBg: 'bg-green-50 text-green-600 border border-green-200',
      sub: 'Coût transport baseline − optimisé',
    },
    {
      label: 'Réduction distance',
      value: loading ? '…' : fmtPct(g?.distancePct),
      icon: 'route',
      iconBg: 'bg-primary/10 text-primary border border-primary/20',
      sub: loading ? '' : `${nf(g?.distanceKm)} km évités`,
    },
    {
      label: 'Temps économisé',
      value: loading ? '…' : `${nf(g?.tempsH)} h`,
      icon: 'schedule',
      iconBg: 'bg-tertiary/10 text-tertiary border border-tertiary/20',
      sub: `Conduite à ${nf(params.vitesseKmh, 0)} km/h`,
    },
    {
      label: 'Véhicules économisés',
      value: loading ? '…' : nf(g?.vehicules, 0),
      icon: 'local_shipping',
      iconBg: 'bg-surface-light text-on-surface border border-outline-variant',
      sub: loading ? '' : `${nf(b?.vehicules, 0)} → ${nf(o?.vehicules, 0)} véhicules`,
    },
    {
      label: 'CO₂ évité',
      value: loading ? '…' : `${nf(g?.co2Kg)} kg`,
      icon: 'eco',
      iconBg: 'bg-green-50 text-green-700 border border-green-200',
      sub: `Facteur ${nf(params.facteurCo2KgParL, 2)} kg/L`,
    },
  ]

  const donneesGraphique = b && o
    ? [
        { indicateur: 'Distance (km)', baseline: b.distanceKm, optimise: o.distanceKm },
        { indicateur: 'Temps (h)', baseline: b.tempsH, optimise: o.tempsH },
        { indicateur: 'Carburant (L)', baseline: b.carburantL, optimise: o.carburantL },
        { indicateur: 'CO₂ (kg)', baseline: b.co2Kg, optimise: o.co2Kg },
      ]
    : []

  const lignes = [
    { nom: 'Distance (km)', base: b?.distanceKm, opt: o?.distanceKm, gain: g?.distanceKm, pct: g?.distancePct, max: 2 },
    { nom: 'Temps (h)', base: b?.tempsH, opt: o?.tempsH, gain: g?.tempsH, pct: g?.tempsPct, max: 2 },
    { nom: 'Véhicules', base: b?.vehicules, opt: o?.vehicules, gain: g?.vehicules, pct: null, max: 0 },
    { nom: 'Coût transport (Ar)', base: b?.coutAr, opt: o?.coutAr, gain: g?.coutAr, pct: g?.coutPct, max: 0 },
    { nom: 'Carburant (L)', base: b?.carburantL, opt: o?.carburantL, gain: g?.carburantL, pct: null, max: 1 },
    { nom: 'CO₂ (kg)', base: b?.co2Kg, opt: o?.co2Kg, gain: g?.co2Kg, pct: null, max: 1 },
  ]

  const champNum = (cle, label, unite) => (
    <label key={cle} className="flex flex-col gap-1">
      <span className="font-display text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
        {label} {unite && <span className="normal-case tracking-normal font-body font-normal">({unite})</span>}
      </span>
      <input
        type="number"
        min="0"
        step="any"
        value={form[cle]}
        onChange={(e) => setForm({ ...form, [cle]: e.target.value })}
        className="w-full rounded border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none"
      />
    </label>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline-variant/60 pb-5 md:flex-row md:items-end">
        <div>
          <span className="font-stamp text-xs uppercase rounded bg-primary/10 px-2 py-0.5 text-primary border border-primary/30">
            GAINS DE L'OPTIMISATION
          </span>
          <h2 className="font-display mt-1 text-3xl font-bold uppercase tracking-tight text-on-surface">
            Baseline vs MadaLogistiX
          </h2>
          <p className="font-body text-sm text-on-surface-variant">
            Comparaison des scénarios appliqués aux mêmes livraisons — distances à vol d'oiseau (haversine).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-display text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Hub
            </span>
            <select
              value={hubId}
              onChange={(e) => setHubId(e.target.value)}
              className="rounded border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Tous les hubs</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.nom}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Barre de paramètres (constantes configurables) */}
      <div className="waybill-card flex flex-wrap items-end gap-4 p-4">
        {champNum('vitesseKmh', 'Vitesse moyenne', 'km/h')}
        {champNum('consoL100km', 'Consommation', 'L/100 km')}
        {champNum('prixFuelArParL', 'Prix carburant', 'Ar/L')}
        {champNum('facteurCo2KgParL', 'Facteur CO₂', 'kg/L')}
        {champNum('coutHoraireAr', "Coût main-d'œuvre", 'Ar/h')}
        <button
          onClick={appliquerParams}
          className="rounded bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
        >
          Appliquer
        </button>
      </div>

      {data?.avertissement && (
        <div className="flex items-start gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-3">
          <span className="material-symbols-outlined text-amber-600">warning</span>
          <p className="font-body text-sm text-amber-800">{data.avertissement}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded border border-error/40 bg-error/10 px-4 py-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body text-sm text-error">{error}</p>
        </div>
      )}

      {/* KPI (README §23) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cartes.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Graphique baseline vs optimisé */}
      <div className="waybill-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">bar_chart</span>
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
            Baseline vs optimisé
          </h3>
        </div>
        {loading ? (
          <div className="flex h-72 items-center justify-center font-body text-sm text-on-surface-variant">
            Calcul en cours…
          </div>
        ) : donneesGraphique.length === 0 ? (
          <div className="flex h-72 items-center justify-center font-body text-sm text-on-surface-variant">
            Aucune donnée à afficher.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={donneesGraphique} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="indicateur" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => nf(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="baseline" name="Baseline" fill={COULEUR_BASELINE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="optimise" name="MadaLogistiX" fill={COULEUR_OPTIMISE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tableau détaillé (README §20) */}
      <div className="waybill-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">table_view</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
              Détail des indicateurs
            </h3>
          </div>
          {p && (
            <p className="font-body text-xs text-on-surface-variant">
              {p.hubNom ? `Hub ${p.hubNom} · ` : ''}
              {nf(p.nbDemandes, 0)} demande(s) · {nf(p.nbTournees, 0)} tournée(s)
              {p.nbDemandesIgnorees + p.nbTourneesIgnorees > 0 &&
                ` · ${p.nbDemandesIgnorees + p.nbTourneesIgnorees} ignoré(s)`}
              {p.nbTourneesFallback > 0 && ` · ${p.nbTourneesFallback} en vol d'oiseau`}
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Indicateur
                </th>
                <th className="px-6 py-3.5 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Baseline
                </th>
                <th className="px-6 py-3.5 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  MadaLogistiX
                </th>
                <th className="px-6 py-3.5 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Gain
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">
                    Chargement…
                  </td>
                </tr>
              ) : !data ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">
                    Aucune donnée.
                  </td>
                </tr>
              ) : (
                lignes.map((l) => (
                  <tr key={l.nom} className="transition-colors hover:bg-surface-light/70">
                    <td className="px-6 py-4 font-body text-sm font-medium text-on-surface">{l.nom}</td>
                    <td className="px-6 py-4 font-mono text-sm text-on-surface-variant tabular-nums">
                      {l.nom.startsWith('Coût') ? fmtAr(l.base) : nf(l.base, l.max)}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-on-surface tabular-nums">
                      {l.nom.startsWith('Coût') ? fmtAr(l.opt) : nf(l.opt, l.max)}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold tabular-nums text-green-700">
                      {l.nom.startsWith('Coût') ? fmtAr(l.gain) : nf(l.gain, l.max)}
                      {l.pct != null && (
                        <span className="ml-2 text-xs font-normal text-on-surface-variant">
                          ({fmtPct(l.pct)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-outline-variant bg-surface-light/60 px-6 py-3">
          <p className="font-body text-xs text-on-surface-variant">
            <strong className="font-display uppercase tracking-wide">Méthode —</strong> Baseline : aller-retour
            individuel hub → livraison, distance vol d'oiseau (haversine). Optimisé : distances des tournées
            planifiées (stockées en base, recalcul en vol d'oiseau si absente). Temps, carburant, CO₂ et coût
            sont déduits de la distance selon les formules du cahier des charges (§6–§14). Même périmètre de
            livraisons pour les deux scénarios.
          </p>
        </div>
      </div>
    </div>
  )
}
