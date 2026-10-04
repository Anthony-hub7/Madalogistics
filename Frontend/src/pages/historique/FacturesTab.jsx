import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { facturesService } from '../../services/facturesService'
import { demandesService } from '../../services/demandesService'
import PhotoPreuve from '../../components/PhotoPreuve'

const fmtAr = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} Ar`

const STATUT_STYLES = {
  EMISE: 'bg-tertiary/10 text-tertiary border border-tertiary/30',
  PAYEE: 'bg-green-100 text-green-700 border border-green-200',
  ANNULEE: 'bg-error/10 text-error border border-error/30',
}

const FILTRES_STATUT = [
  { key: '', label: 'Toutes' },
  { key: 'EMISE', label: 'Émises' },
  { key: 'PAYEE', label: 'Payées' },
  { key: 'ANNULEE', label: 'Annulées' },
]

function DetailFacture({ facture, onClose }) {
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErreur(null)
    demandesService.getFacture(facture.demandeId).then(
      (res) => { if (!cancelled) { setDetail(res); setLoading(false) } },
      (err) => { if (!cancelled) { setErreur(err.message || 'Erreur de chargement'); setLoading(false) } }
    )
    return () => { cancelled = true }
  }, [facture.demandeId])

  const preuves = detail?.preuves || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4 sticky top-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-on-surface">Facture {String(facture.factureId).slice(0, 8)}</h3>
              <p className="font-mono text-[11px] text-on-surface-variant">Émise le {facture.dateEmission ? new Date(facture.dateEmission).toLocaleString('fr-FR') : '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high cursor-pointer" aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
              <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Montant total</p>
              <p className="font-display text-xl font-bold text-on-surface tabular-nums">{fmtAr(facture.montantTotal)}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
              <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Statut</p>
              <span className={`inline-block mt-1 rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUT_STYLES[facture.statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}>
                {facture.statut}
              </span>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
              <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Client</p>
              <p className="font-body text-sm font-medium text-on-surface">{facture.clientNom || '—'}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
              <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Destination</p>
              <p className="font-body text-sm text-on-surface">{facture.adresseLivraison || '—'}</p>
            </div>
          </div>

          {loading && (
            <div className="text-center py-4">
              <span className="material-symbols-outlined animate-spin text-[#8A8A92]">sync</span>
              <p className="font-mono text-xs text-on-surface-variant mt-1">Chargement du détail…</p>
            </div>
          )}
          {erreur && <p className="text-sm text-error text-center">{erreur}</p>}

          {!loading && detail?.existe && (
            <div className="rounded-lg border border-outline-variant p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tarif commande</span>
                <span className="font-mono font-bold text-on-surface">{fmtAr(detail.tarif)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Distance</span>
                <span className="font-mono text-on-surface">{detail.distanceKm || 0} km</span>
              </div>
            </div>
          )}

          {/* Preuves de livraison (images) */}
          {!loading && (
            <div className="border-t border-outline-variant pt-4 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                Preuves de livraison {preuves.length > 0 ? `(${preuves.length})` : ''}
              </h4>
              {preuves.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  {facture.nbPreuves > 0 ? 'Chargement des images…' : 'Aucune photo enregistrée pour cette livraison.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {preuves.map((p) => (
                    <div key={p.etapeId} className="rounded-lg border border-outline-variant bg-surface-light p-3">
                      <PhotoPreuve
                        demandeId={facture.demandeId}
                        etapeId={p.etapeId}
                        alt={`Preuve ${p.descriptionColis || ''} étape ${p.ordre}`}
                        className="w-full h-36 rounded mb-2"
                      />
                      <p className="font-mono text-[11px] font-bold text-on-surface">{p.descriptionColis || 'Colis'}</p>
                      <p className="font-mono text-[10px] text-on-surface-variant">
                        Étape {p.ordre} — {p.poidsKg ? `${p.poidsKg} kg` : ''}
                      </p>
                      {p.signatureNom && <p className="font-mono text-[10px] text-on-surface">Signé : {p.signatureNom}</p>}
                      {p.dateLivraison && (
                        <p className="font-mono text-[10px] text-on-surface-variant">{new Date(p.dateLivraison).toLocaleString('fr-FR')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
            <button
              onClick={() => navigate(`/logistics/commande_detail?id=${facture.demandeId}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary text-primary font-display text-xs uppercase font-bold tracking-wider hover:bg-primary/5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Voir la commande
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FacturesTab() {
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [statut, setStatut] = useState('')
  const [recherche, setRecherche] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selection, setSelection] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErreur(null)
    facturesService.getAll({ statut: statut || undefined }).then(
      (res) => { if (!cancelled) { setFactures(res || []); setLoading(false) } },
      (err) => { if (!cancelled) { setErreur(err.message || 'Erreur de chargement'); setLoading(false) } }
    )
    return () => { cancelled = true }
  }, [statut])

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return factures.filter((f) => {
      if (from && (!f.dateEmission || f.dateEmission.slice(0, 10) < from)) return false
      if (to && (!f.dateEmission || f.dateEmission.slice(0, 10) > to)) return false
      if (!q) return true
      return (f.clientNom || '').toLowerCase().includes(q)
        || (f.adresseLivraison || '').toLowerCase().includes(q)
        || String(f.factureId).toLowerCase().includes(q)
    })
  }, [factures, recherche, from, to])

  const totalFiltre = filtrees.reduce((s, f) => s + Number(f.montantTotal || 0), 0)

  return (
    <div className="space-y-4">
      <div className="waybill-card p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTRES_STATUT.map((f) => (
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
              placeholder="Client, destination, n° facture…"
              className="w-full bg-transparent font-body text-sm text-on-surface outline-none placeholder:text-outline"
            />
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Du</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                 className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-mono text-xs text-on-surface" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Au</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                 className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-mono text-xs text-on-surface" />
        </label>
      </div>

      <div className="waybill-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
              Factures <span className="text-on-surface-variant font-normal">({filtrees.length})</span>
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-on-surface tabular-nums">Total : {fmtAr(totalFiltre)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">N° Facture</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Client</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Destination</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Date</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant text-right">Montant</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Statut</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Preuve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Chargement…</td></tr>
              ) : erreur ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center font-body text-sm text-error">{erreur}</td></tr>
              ) : filtrees.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Aucune facture ne correspond aux filtres.</td></tr>
              ) : (
                filtrees.map((f) => (
                  <tr key={f.factureId}
                      className="transition-colors hover:bg-surface-light/70 cursor-pointer"
                      onClick={() => setSelection(f)}>
                    <td className="px-6 py-4 font-mono font-bold text-sm text-on-surface">{String(f.factureId).slice(0, 8)}</td>
                    <td className="px-6 py-4 font-body text-sm font-medium text-on-surface">{f.clientNom || '—'}</td>
                    <td className="px-6 py-4 font-body text-sm text-on-surface-variant max-w-[220px] truncate">{f.adresseLivraison || '—'}</td>
                    <td className="px-6 py-4 font-body text-sm text-on-surface-variant">{f.dateEmission ? new Date(f.dateEmission).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-on-surface text-right tabular-nums">{fmtAr(f.montantTotal)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUT_STYLES[f.statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}>
                        {f.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(f.nbPreuves || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-700 text-xs font-bold">
                          <span className="material-symbols-outlined text-sm">photo_camera</span>
                          {f.nbPreuves}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selection && <DetailFacture facture={selection} onClose={() => setSelection(null)} />}
    </div>
  )
}
