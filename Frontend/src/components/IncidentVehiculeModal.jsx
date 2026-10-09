import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { sacsService } from '../services/sacsService'
import { flotteService } from '../services/flotteService'

const STATUTS_ACTIFS = ['AFFECTE', 'EN_TRANSIT']

function toItem(d) {
  return {
    sacId: d.sacId,
    statut: d.statut,
    immatriculation: d.immatriculation,
    chauffeurNom: d.chauffeurNom,
    nbColis: Array.isArray(d.colis) ? d.colis.length : (d.nbColis ?? 0),
    tournee: Boolean(d.tourneeId) || Boolean(d.hasTournee),
  }
}

/**
 * Modale « petitemenetre » de mise hors service d'un vehicule sur incident
 * (panne). Recalcule en douceur les sacs actifs rattaches (colis liberes,
 * demandes en attente de groupage, tournees terminees), bascule le vehicule
 * en HORS_SERVICE puis redirige vers la page vehicules.
 *
 * props : open, sacId?, vehiculeId?, immatriculation?, titre?, message?,
 *         onClose, onDone(resultat)
 */
export default function IncidentVehiculeModal({
  open,
  sacId,
  vehiculeId,
  immatriculation,
  titre,
  message,
  onClose,
  onDone,
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)
  const [actifs, setActifs] = useState([])
  const [resolvedId, setResolvedId] = useState(null)
  const [immat, setImmat] = useState('')
  const [motif, setMotif] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const charger = async () => {
      setLoading(true)
      setError(null)
      setDetail(null)
      setActifs([])
      setResolvedId(vehiculeId || null)
      setImmat(immatriculation || '')
      setMotif(titre ? 'Panne signalée sur la route' : '')

      try {
        let d = null
        if (sacId) {
          d = await sacsService.detail(sacId)
          if (cancelled) return
        }
        setDetail(d)

        const vId = vehiculeId || d?.vehiculeId || null
        setResolvedId(vId)
        if (!immatriculation && d?.immatriculation) setImmat(d.immatriculation)

        if (vId) {
          const sacs = await sacsService.getAll()
          if (cancelled) return
          const liste = (Array.isArray(sacs) ? sacs : [])
            .filter((s) => s.vehiculeId === vId && STATUTS_ACTIFS.includes(s.statut))
            .map(toItem)
          setActifs(liste.length > 0 ? liste : (d && STATUTS_ACTIFS.includes(d.statut) ? [toItem(d)] : []))
        } else if (d) {
          setActifs(STATUTS_ACTIFS.includes(d.statut) ? [toItem(d)] : [])
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Chargement impossible')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    charger()
    return () => { cancelled = true }
  }, [open, sacId, vehiculeId, immatriculation, titre])

  const nbColis = actifs.reduce((t, s) => t + (s.nbColis || 0), 0)
  const nbTournees = actifs.filter((s) => s.tournee).length

  const handleHorsService = async () => {
    if (!resolvedId) {
      setError('Aucun vehicule rattache : mise hors service impossible')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await flotteService.mettreHorsService(resolvedId, { motif: motif || undefined })
      onDone?.(res)
      // Recharge la page vehicules si elle est deja ouverte (meme route)
      window.dispatchEvent(new CustomEvent('vehicule:statut-change', { detail: res }))
      onClose?.()
      navigate('/logistics/flotte')
    } catch (e) {
      setError(e?.message || 'Erreur lors de la mise hors service')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  // Portal : le header utilise backdrop-blur, qui ferait du <header> le bloc
  // conteneur du position: fixed et afficherait la modale au-dessus du header
  // plutot que sur la page.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}>
      <div
        className="my-auto flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-3xl text-error">warning</span>
          <div className="flex-1">
            <h3 className="font-headline-md text-headline-md text-on-surface">Mettre hors service</h3>
            <p className="font-body text-sm text-on-surface-variant">
              Annulation des missions en cours, puis retrait du vehicule du parc actif.
            </p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant transition-colors hover:text-primary" aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {(titre || message) && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2.5">
            <span className="material-symbols-outlined text-error">report</span>
            <div>
              {titre && <p className="font-body text-sm font-bold text-error">{titre}</p>}
              {message && <p className="font-body text-xs text-on-surface-variant">{message}</p>}
            </div>
          </div>
        )}

        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low/40 px-3 py-2.5">
            <div>
              <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Vehicule</p>
              <p className="font-display text-sm font-bold text-on-surface">
                {immat || (detail?.immatriculation) || '—'}
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">local_shipping</span>
          </div>

          <div className="rounded-lg border border-outline-variant px-3 py-2.5">
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">
              Sacs impactés ({loading ? '…' : actifs.length})
            </p>
            {loading ? (
              <p className="font-body text-sm text-on-surface-variant">Chargement…</p>
            ) : actifs.length === 0 ? (
              <p className="font-body text-sm italic text-outline-variant">Aucun sac actif sur ce vehicule.</p>
            ) : (
              <ul className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {actifs.map((s) => (
                  <li key={s.sacId} className="flex items-center justify-between gap-2">
                    <span className="font-body text-sm text-on-surface">
                      <span className="font-mono text-xs">{String(s.sacId).slice(0, 8)}</span>
                      {s.immatriculation ? ` · ${s.immatriculation}` : ''}
                      {s.chauffeurNom ? ` · ${s.chauffeurNom}` : ''}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {s.statut} · {s.nbColis} colis{s.tournee ? ' · tournée' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!loading && actifs.length > 0 && (
              <p className="mt-2 font-body text-xs text-error">
                {actifs.length} sac(s) seront annulés : {nbColis} colis libérés
                {nbTournees > 0 ? `, ${nbTournees} tournée(s) terminée(s)` : ''}, les demandes
                repartent en attente de groupage.
              </p>
            )}
          </div>

          <div>
            <label className="font-label-md text-label-sm font-bold uppercase text-on-surface-variant" htmlFor="motif-hors-service">
              Motif (tracé dans l&apos;audit)
            </label>
            <textarea
              id="motif-hors-service"
              rows={2}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="ex : panne moteur signalée par le chauffeur"
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none" />
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2.5">
            <span className="material-symbols-outlined text-error">error</span>
            <p className="font-body text-sm text-error">{error}</p>
          </div>
        )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-outline-variant bg-surface p-6 pt-4">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-lg border border-outline-variant font-label-md text-on-surface transition-colors hover:bg-surface-container-high">
            Annuler
          </button>
          <button
            onClick={handleHorsService}
            disabled={submitting || loading}
            className="h-11 flex-[2] rounded-lg bg-error font-label-md text-on-error transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                Mise hors service…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                Mettre hors service
              </span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
