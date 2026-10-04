import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { facturesService } from '../../services/facturesService'
import { sacsService } from '../../services/sacsService'

const fmtAr = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} Ar`

const STATUT_FACTURE_STYLES = {
  EMISE: 'bg-tertiary/10 text-tertiary border border-tertiary/30',
  PAYEE: 'bg-green-100 text-green-700 border border-green-200',
  ANNULEE: 'bg-error/10 text-error border border-error/30',
}

function moisCle(d) {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function moisCourt(cle) {
  const [y, m] = cle.split('-')
  const noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  return `${noms[Number(m) - 1]} ${y.slice(2)}`
}

/** Les 12 derniers mois, avec les mois vides à 0 (série complète pour le graphe). */
function serieMensuelle(factures) {
  const parMois = {}
  factures.forEach((f) => {
    if (!f.dateEmission || f.statut === 'ANNULEE') return
    const cle = moisCle(f.dateEmission)
    parMois[cle] = (parMois[cle] || 0) + Number(f.montantTotal || 0)
  })

  const series = []
  const d = new Date()
  for (let i = 11; i >= 0; i--) {
    const ref = new Date(d.getFullYear(), d.getMonth() - i, 1)
    const cle = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
    series.push({ mois: moisCourt(cle), montant: Math.round(parMois[cle] || 0) })
  }
  return series
}

function topClients(factures, limit = 5) {
  const parClient = {}
  factures.forEach((f) => {
    if (f.statut === 'ANNULEE') return
    const cle = f.clientNom || 'Client non renseigné'
    if (!parClient[cle]) parClient[cle] = { nom: cle, montant: 0, nb: 0 }
    parClient[cle].montant += Number(f.montantTotal || 0)
    parClient[cle].nb += 1
  })
  return Object.values(parClient)
    .sort((a, b) => b.montant - a.montant)
    .slice(0, limit)
}

export default function HistoriqueDashboardTab() {
  const navigate = useNavigate()
  const [factures, setFactures] = useState([])
  const [sacs, setSacs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [fRes, sRes] = await Promise.allSettled([
        facturesService.getAll(),
        sacsService.getAll(),
      ])
      if (cancelled) return
      if (fRes.status === 'fulfilled') setFactures(fRes.value || [])
      if (sRes.status === 'fulfilled') setSacs(sRes.value || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const facturesValides = factures.filter(f => f.statut !== 'ANNULEE')
  const caTotal = facturesValides.reduce((s, f) => s + Number(f.montantTotal || 0), 0)
  const caEncaisse = facturesValides
    .filter(f => f.statut === 'PAYEE')
    .reduce((s, f) => s + Number(f.montantTotal || 0), 0)
  const nbEmises = factures.filter(f => f.statut === 'EMISE').length
  const sacsLivre = sacs.filter(s => s.statut === 'LIVRE').length
  const tauxPreuve = facturesValides.length > 0
    ? Math.round(facturesValides.filter(f => (f.nbPreuves || 0) > 0).length / facturesValides.length * 100)
    : null
  const tauxRemplissage = sacs.length > 0
    ? Math.round(sacs.reduce((sum, s) => sum + (s.tauxRemplissage || 0), 0) / sacs.length)
    : null

  const stats = [
    { label: 'Chiffre d\'affaires facturé', value: loading ? '…' : fmtAr(caTotal), icon: 'payments', iconBg: 'bg-primary/10 text-primary border border-primary/20' },
    { label: 'Encaissé (factures payées)', value: loading ? '…' : fmtAr(caEncaisse), icon: 'account_balance', iconBg: 'bg-green-50 text-green-600 border border-green-200' },
    { label: 'Factures en attente', value: loading ? '…' : nbEmises, icon: 'receipt_long', iconBg: 'bg-tertiary/10 text-tertiary border border-tertiary/20' },
    { label: 'Sacs livrés', value: loading ? '…' : `${sacsLivre} / ${sacs.length}`, icon: 'inventory_2', iconBg: 'bg-surface-light text-on-surface border border-outline-variant' },
    { label: 'Taux de preuve photo', value: loading ? '…' : tauxPreuve !== null ? `${tauxPreuve} %` : '—', icon: 'photo_camera', iconBg: 'bg-green-50 text-green-700 border border-green-200' },
    { label: 'Remplissage moyen', value: loading ? '…' : tauxRemplissage !== null ? `${tauxRemplissage} %` : '—', icon: 'local_shipping', iconBg: 'bg-surface-light text-on-surface border border-outline-variant' },
  ]

  const serie = serieMensuelle(factures)
  const clients = topClients(factures)
  const dernieres = [...factures]
    .sort((a, b) => new Date(b.dateEmission) - new Date(a.dateEmission))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="waybill-card flex flex-col justify-between p-5 border-l-4 border-l-primary relative overflow-hidden transition-all duration-150 hover:border-primary">
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded p-2 ${stat.iconBg}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant font-semibold">{stat.label}</p>
              <p className="font-display text-2xl font-bold mt-1 text-on-surface tabular-nums">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="waybill-card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Chiffre d'affaires mensuel</h3>
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant">12 derniers mois — hors annulés</span>
          </div>
          <div className="p-4 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-outline">progress_activity</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#8A8A92' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8A8A92' }} axisLine={false} tickLine={false} width={70}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
                  <Tooltip
                    formatter={(v) => [fmtAr(v), 'Facturé']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #ECECEC', fontSize: 12 }}
                  />
                  <Bar dataKey="montant" fill="#E8433D" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="waybill-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-outline-variant bg-surface-light px-6 py-4">
            <span className="material-symbols-outlined text-primary">group</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Top clients</h3>
          </div>
          <div className="divide-y divide-outline-variant/40">
            {loading ? (
              <div className="px-6 py-8 text-center text-sm text-on-surface-variant">Chargement…</div>
            ) : clients.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-on-surface-variant">Aucune facture encore.</div>
            ) : clients.map((c, i) => (
              <div key={c.nom} className="flex items-center gap-3 px-6 py-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-display text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-medium text-on-surface truncate">{c.nom}</p>
                  <p className="font-mono text-[10px] text-on-surface-variant">{c.nb} facture{c.nb > 1 ? 's' : ''}</p>
                </div>
                <span className="font-mono text-xs font-bold text-on-surface tabular-nums">{fmtAr(c.montant)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="waybill-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Dernières factures</h3>
          </div>
          <button
            onClick={() => navigate('/logistics/historique?onglet=factures')}
            className="font-display text-xs uppercase font-bold tracking-wider text-primary hover:underline"
          >
            Voir tout
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">N° Facture</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Client</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Date</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant text-right">Montant</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Chargement…</td></tr>
              ) : dernieres.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Aucune facture. Les factures sont générées automatiquement à la livraison.</td></tr>
              ) : (
                dernieres.map((f) => (
                  <tr key={f.factureId} className="transition-colors hover:bg-surface-light/70 cursor-pointer"
                      onClick={() => navigate('/logistics/historique?onglet=factures')}>
                    <td className="px-6 py-4 font-mono font-bold text-sm text-on-surface">{String(f.factureId).slice(0, 8)}</td>
                    <td className="px-6 py-4 font-body text-sm font-medium text-on-surface">{f.clientNom || '—'}</td>
                    <td className="px-6 py-4 font-body text-sm text-on-surface-variant">{f.dateEmission ? new Date(f.dateEmission).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-on-surface text-right tabular-nums">{fmtAr(f.montantTotal)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUT_FACTURE_STYLES[f.statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}>
                        {f.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
