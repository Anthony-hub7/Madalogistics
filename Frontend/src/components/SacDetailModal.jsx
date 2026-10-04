import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sacsService } from '../services/sacsService'
import PhotoPreuve from './PhotoPreuve'

const fmtAr = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} Ar`

const SAC_STATUT_STYLES = {
  CONSTITUE: 'bg-outline-variant/30 text-on-surface-variant border border-outline-variant',
  AFFECTE: 'bg-tertiary/10 text-tertiary border border-tertiary/30',
  EN_TRANSIT: 'bg-primary/10 text-primary border border-primary/30',
  LIVRE: 'bg-green-100 text-green-700 border border-green-200',
}

const COLIS_ETAT_STYLES = {
  EN_ATTENTE: 'bg-outline-variant/30 text-on-surface-variant',
  GROUPEE: 'bg-secondary/10 text-secondary',
  EN_TRANSIT: 'bg-primary/10 text-primary',
  LIVRE: 'bg-green-100 text-green-700',
  INCIDENT: 'bg-error/10 text-error',
}

/**
 * Détail complet d'un sac : chauffeur, clients, colis + commande d'origine,
 * factures liées, preuves de livraison et étapes.
 * Réutilisé par la page Sacs (logistique) et l'onglet Sacs de l'Historique.
 */
export default function SacDetailModal({ sacId, onClose }) {
  const navigate = useNavigate()
  const [sac, setSac] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErreur(null)
    sacsService.detail(sacId).then(
      (res) => { if (!cancelled) { setSac(res); setLoading(false) } },
      (err) => { if (!cancelled) { setErreur(err.message || 'Erreur de chargement'); setLoading(false) } }
    )
    return () => { cancelled = true }
  }, [sacId])

  const etapesAvecPhoto = (sac?.etapes || []).filter(e => e.photoPreuvePresente)
  // L'etape porte le colisId ; la photo se telecharge via la demande d'origine
  const demandeIdDuColis = (colisId) => (sac?.colis || []).find(c => c.colisId === colisId)?.demandeId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4 sticky top-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                Sac {String(sacId).slice(0, 8)}
              </h3>
              <p className="font-mono text-[11px] text-on-surface-variant">{sac?.hubNom || '—'} · {sac?.categorieDominante || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high cursor-pointer" aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined animate-spin text-[#8A8A92]">sync</span>
              <p className="font-mono text-xs text-on-surface-variant mt-1">Chargement du détail du sac…</p>
            </div>
          )}
          {erreur && <p className="text-sm text-error text-center">{erreur}</p>}

          {!loading && sac && (
            <>
              {/* Resume + chauffeur */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
                  <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Statut</p>
                  <span className={`inline-block mt-1 rounded px-2 py-0.5 text-xs font-bold uppercase ${SAC_STATUT_STYLES[sac.statut] || ''}`}>
                    {sac.statut}
                  </span>
                </div>
                <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
                  <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Colis</p>
                  <p className="font-display text-lg font-bold text-on-surface">{sac.nbColis} · {sac.poidsKg} kg</p>
                </div>
                <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
                  <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Remplissage</p>
                  <p className="font-display text-lg font-bold text-on-surface">{Math.round(sac.tauxRemplissage || 0)} %</p>
                </div>
                <div className="rounded-lg border border-outline-variant bg-surface-light p-3">
                  <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Véhicule</p>
                  <p className="font-mono text-sm font-bold text-on-surface">{sac.immatriculation || '—'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-light px-4 py-2.5 flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  <div>
                    <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Chauffeur</p>
                    <p className="font-body text-sm font-medium text-on-surface">{sac.chauffeurNom || 'Non affecté'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-light px-4 py-2.5 flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined text-primary">group</span>
                  <div>
                    <p className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                      Client{sac.clients.length > 1 ? 's' : ''} ({sac.clients.length})
                    </p>
                    <p className="font-body text-sm text-on-surface truncate">{sac.clients.join(', ') || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Colis + commande d'origine */}
              <div className="border-t border-outline-variant pt-4 space-y-2">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                  Colis ({sac.colis.length}) &amp; commande d'origine
                </h4>
                <div className="overflow-x-auto rounded-lg border border-outline-variant">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-light/60">
                        <th className="px-4 py-2.5 font-display text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Colis</th>
                        <th className="px-4 py-2.5 font-display text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Catégorie</th>
                        <th className="px-4 py-2.5 font-display text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Poids</th>
                        <th className="px-4 py-2.5 font-display text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">État</th>
                        <th className="px-4 py-2.5 font-display text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Commande</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {sac.colis.map((c) => (
                        <tr key={c.colisId} className="hover:bg-surface-light/60">
                          <td className="px-4 py-2.5 font-mono text-xs font-bold text-on-surface">{String(c.colisId).slice(0, 8)}</td>
                          <td className="px-4 py-2.5 font-body text-xs text-on-surface">{c.categorie}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-on-surface-variant">{c.poidsKg} kg</td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${COLIS_ETAT_STYLES[c.etat] || ''}`}>{c.etat}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            {c.demandeId ? (
                              <button
                                onClick={() => navigate(`/logistics/commande_detail?id=${c.demandeId}`)}
                                className="flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline cursor-pointer"
                                title={c.adresseLivraison || ''}
                              >
                                {String(c.demandeId).slice(0, 8)}
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                              </button>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Demandes + factures */}
              {sac.demandes.length > 0 && (
                <div className="border-t border-outline-variant pt-4 space-y-2">
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">Factures liées</h4>
                  <div className="space-y-1.5">
                    {sac.demandes.map((d) => (
                      <div key={d.demandeId} className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-light px-4 py-2">
                        <div className="min-w-0">
                          <p className="font-body text-sm font-medium text-on-surface truncate">{d.clientNom || '—'}</p>
                          <p className="font-mono text-[10px] text-on-surface-variant">Cmd {String(d.demandeId).slice(0, 8)} · {d.statut}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs font-bold text-on-surface tabular-nums">{fmtAr(d.tarif)}</span>
                          {d.factureId ? (
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${d.factureStatut === 'PAYEE' ? 'bg-green-100 text-green-700' : 'bg-tertiary/10 text-tertiary'}`}>
                              {d.factureStatut}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-on-surface-variant">Non facturée</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preuves de livraison */}
              <div className="border-t border-outline-variant pt-4 space-y-3">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                  Preuves de livraison ({etapesAvecPhoto.length})
                </h4>
                {etapesAvecPhoto.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    {sac.statut === 'LIVRE'
                      ? 'Aucune photo enregistrée pour ce sac.'
                      : 'Les photos seront disponibles après livraison.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {etapesAvecPhoto.map((e) => (
                      <div key={e.etapeId} className="rounded-lg border border-outline-variant bg-surface-light p-2">
                        <PhotoPreuve
                          demandeId={demandeIdDuColis(e.colisId)}
                          etapeId={e.etapeId}
                          alt={`Preuve étape ${e.ordre}`}
                          className="w-full h-24 rounded mb-1.5"
                        />
                        <p className="font-mono text-[10px] font-bold text-on-surface">Étape {e.ordre} · {e.typeEtape}</p>
                        {e.signatureNom && <p className="font-mono text-[10px] text-on-surface-variant">Signé : {e.signatureNom}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toutes les etapes (etat complet) */}
              {sac.etapes.length > 0 && (
                <div className="border-t border-outline-variant pt-4 space-y-2">
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">Étapes ({sac.etapes.length})</h4>
                  <div className="space-y-1.5">
                    {sac.etapes.map((e) => (
                      <div key={e.etapeId} className="flex items-center gap-3 rounded-lg border border-outline-variant px-4 py-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${e.photoPreuvePresente ? 'bg-green-100 text-green-700' : 'bg-outline-variant/40 text-on-surface-variant'}`}>
                          {e.ordre}
                        </span>
                        <span className="font-body text-xs font-bold text-on-surface">{e.typeEtape}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant flex-1 truncate">{e.clientNom || '—'}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant">{e.dateReelle ? new Date(e.dateReelle).toLocaleDateString('fr-FR') : '—'}</span>
                        {e.photoPreuvePresente
                          ? <span className="material-symbols-outlined text-sm text-green-600" title="Photo de preuve">photo_camera</span>
                          : <span className="material-symbols-outlined text-sm text-outline" title="Pas de photo">hide_image</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
