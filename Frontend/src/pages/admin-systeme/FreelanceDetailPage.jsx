import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'

const statutConfig = {
  EN_ATTENTE: { label: 'EN ATTENTE', bg: '#F7F7F8', color: '#8A8A92', border: '#ECECEC' },
  VALIDEE: { label: 'VALIDEE', bg: '#E8F5E9', color: '#1A1A1E', border: '#1A1A1E' },
  REFUSEE: { label: 'REFUSEE', bg: '#FDE8E6', color: '#E8433D', border: '#E8433D' },
}

function PermisPreview({ chauffeurId, hasPermisScan }) {
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!hasPermisScan || !chauffeurId) return
    setLoading(true)
    adminService.fetchDocumentPermis(chauffeurId)
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }, [chauffeurId, hasPermisScan])

  if (!hasPermisScan && !doc) {
    return (
      <div className="rounded-xl border-2 border-dashed p-6" style={{ borderColor: '#E8433D', backgroundColor: '#FDE8E6' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#FDE8E6' }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: '#E8433D' }}>badge</span>
          </div>
          <div>
            <p className="font-display text-[11px] uppercase tracking-wider font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8433D' }}>
              Scan du permis — MANQUANT
            </p>
            <p className="font-body text-[11px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#E8433D' }}>
              Document obligatoire non fourni
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
      <div className="flex items-center justify-between border-b p-4" style={{ borderColor: '#ECECEC' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: '#1A1A1E' }}>badge</span>
          </div>
          <div>
            <p className="font-display text-[11px] uppercase tracking-wider font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>
              Permis de conduire
            </p>
            {loading && (
              <p className="font-body text-[11px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                Chargement...
              </p>
            )}
            {doc && !loading && (
              <p className="font-body text-[11px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                {doc.name} — {doc.type}
              </p>
            )}
          </div>
        </div>
        {doc && (
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#ECECEC', color: '#8A8A92' }}
            >
              {expanded ? 'Réduire' : 'Agrandir'}
            </button>
            <a
              href={doc.url}
              download={doc.name}
              className="rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80 no-underline"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#E8433D', color: '#E8433D' }}
            >
              Télécharger
            </a>
          </div>
        )}
      </div>

      {doc && (
        <div className={`transition-all ${expanded ? 'h-[600px]' : 'h-[300px]'}`}>
          {doc.type.includes('pdf') ? (
            <iframe src={doc.url} className="h-full w-full border-0" title="Permis de conduire" />
          ) : (
            <img src={doc.url} alt="Permis de conduire" className="h-full w-full object-contain bg-[#F7F7F8]" />
          )}
        </div>
      )}
    </div>
  )
}

export default function FreelanceDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { chauffeurId: propChauffeurId, fromDemandes } = location.state || {}
  const onNavigate = (key, data) => {
    const path = `/admin/${key}`
    navigate(path, { state: data })
  }
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showRefusModal, setShowRefusModal] = useState(false)
  const [motifRefus, setMotifRefus] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const chauffeurId = propChauffeurId
  const isVerification = fromDemandes || data?.statutDossier === 'EN_ATTENTE'

  useEffect(() => {
    if (!chauffeurId) return
    setLoading(true)
    adminService.getFreelance(chauffeurId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [chauffeurId])

  const handleValider = async () => {
    setActionLoading(true)
    try {
      await adminService.validerFreelance(chauffeurId)
      setData(prev => ({ ...prev, statutDossier: 'VALIDEE' }))
    } catch (err) {
      alert(err.message || 'Erreur lors de la validation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefuser = async () => {
    if (!motifRefus.trim()) return
    setActionLoading(true)
    try {
      await adminService.refuserFreelance(chauffeurId, motifRefus.trim())
      setData(prev => ({ ...prev, statutDossier: 'REFUSEE', motifRefus: motifRefus.trim() }))
      setShowRefusModal(false)
      setMotifRefus('')
    } catch (err) {
      alert(err.message || 'Erreur lors du refus')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate(fromDemandes ? 'freelances_demandes' : 'freelances_liste')}
            className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
            <span className="material-symbols-outlined" style={{ color: '#8A8A92' }}>arrow_back</span>
          </button>
          <div>
            <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>Chargement...</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#E8433D]/20 border-t-[#E8433D] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate(fromDemandes ? 'freelances_demandes' : 'freelances_liste')}
            className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
            <span className="material-symbols-outlined" style={{ color: '#8A8A92' }}>arrow_back</span>
          </button>
          <div>
            <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>Chauffeur introuvable</h1>
          </div>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: '#E8433D', backgroundColor: '#FDE8E6' }}>
          <p className="font-body text-body-md" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#E8433D' }}>
            {error || 'Impossible de charger les informations de ce chauffeur.'}
          </p>
        </div>
      </div>
    )
  }

  const nom = data.nom || 'Chauffeur inconnu'
  const st = statutConfig[data.statutDossier] || statutConfig.EN_ATTENTE

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate(fromDemandes ? 'freelances_demandes' : 'freelances_liste')}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: '#F7F7F8' }}>
            <span className="material-symbols-outlined" style={{ color: '#8A8A92' }}>arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
                {nom}
              </h1>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                {st.label}
              </span>
            </div>
            <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              Fiche chauffeur freelance
            </p>
          </div>
        </div>
      </div>

      {/* Barre d'action vérification */}
      {isVerification && data.statutDossier === 'EN_ATTENTE' && (
        <div className="rounded-xl border p-4 flex items-center justify-between" style={{ borderColor: '#E8433D', backgroundColor: '#FDE8E6' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]" style={{ color: '#E8433D' }}>gpp_maybe</span>
            <p className="font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#E8433D' }}>
              Vérification en cours — valider ou refuser ce profil
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRefusModal(true)}
              disabled={actionLoading}
              className="rounded-lg border px-4 py-2 text-[13px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#E8433D', color: '#E8433D', backgroundColor: 'transparent' }}
            >
              Refuser
            </button>
            <button
              onClick={handleValider}
              disabled={actionLoading}
              className="rounded-lg px-4 py-2 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#1A1A1E' }}
            >
              {actionLoading ? 'Validation...' : 'Valider le profil'}
            </button>
          </div>
        </div>
      )}

      {/* Motif refus affiché */}
      {data.statutDossier === 'REFUSEE' && data.motifRefus && (
        <div className="rounded-xl border p-4" style={{ borderColor: '#E8433D', backgroundColor: '#FDE8E6' }}>
          <p className="font-display text-[11px] uppercase tracking-wider font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8433D' }}>
            Motif de refus
          </p>
          <p className="font-body text-body-sm mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>
            {data.motifRefus}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Informations personnelles */}
          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: 'Nom complet', value: nom },
                { label: 'Email', value: data.email },
                { label: 'Téléphone', value: data.telephone },
                { label: 'CIN', value: data.cin },
                { label: 'Sexe', value: data.sexe === 'M' ? 'Masculin' : data.sexe === 'F' ? 'Féminin' : data.sexe },
                { label: 'Adresse', value: data.adresse },
                { label: 'Type', value: data.typeChauffeur === 'FREELANCE' ? 'Freelance' : data.typeChauffeur === 'RATTACHE' ? 'Rattaché' : data.typeChauffeur },
              ].filter(r => r.value).map(r => (
                <div key={r.label}>
                  <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>{r.label}</p>
                  <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Permis & Véhicule */}
          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Permis & Véhicule
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Numéro de permis</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.permisNumero || '—'}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Catégorie(s)</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.permisCategorie || '—'} {data.permisCategories && `(${data.permisCategories})`}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Expiration permis</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>
                  {data.permisExpiration ? new Date(data.permisExpiration).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Expérience</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.experienceAnnees != null ? `${data.experienceAnnees} ans` : '—'}</p>
              </div>
            </div>
          </div>

          {/* Document permis */}
          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Document — Permis de conduire
            </h2>
            <PermisPreview chauffeurId={chauffeurId} hasPermisScan={data.hasPermisScan} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Résumé
            </h2>
            <div className="space-y-4">
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Référence dossier</p>
                <p className="font-stamp text-body-md mt-1 font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif", color: '#E8433D' }}>
                  #CHF-{chauffeurId?.substring(0, 8)?.toUpperCase() || '---'}
                </p>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Statut</p>
                <div className="mt-1">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                    {st.label}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Documents</p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]" style={{ color: data.hasPermisScan ? '#1A1A1E' : '#E8433D' }}>
                      {data.hasPermisScan ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="font-body text-[12px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: data.hasPermisScan ? '#1A1A1E' : '#E8433D' }}>
                      Permis de conduire
                    </span>
                  </div>
                </div>
              </div>
              {(data.marqueModele || data.typeVehicule || data.immatriculation) && (
                <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                  <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Véhicule</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: '#8A8A92' }}>directions_car</span>
                      <span className="font-body text-[12px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>
                        {data.marqueModele || data.typeVehicule}
                      </span>
                    </div>
                    {data.immatriculation && (
                      <span className="inline-block rounded px-2 py-0.5 font-stamp text-[12px] font-bold tracking-wider" style={{ fontFamily: "'Chakra Petch', sans-serif", backgroundColor: '#1A1A1E', color: '#FFFFFF' }}>
                        {data.immatriculation}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal refus */}
      {showRefusModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowRefusModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 pb-10 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="mx-auto mb-6 h-1 w-10 rounded-full" style={{ backgroundColor: '#ECECEC' }} />
            <h3 className="font-display text-headline-md mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Refuser le profil
            </h3>
            <p className="font-body text-body-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              {nom} — Motif du refus obligatoire
            </p>
            <textarea
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              className="mb-4 w-full rounded-xl border p-4 font-body text-body-md outline-none focus:ring-2 focus:ring-red-500/20"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderColor: '#ECECEC', backgroundColor: '#F7F7F8', color: '#1A1A1E' }}
              placeholder="Ex: Permis non conforme, documents manquants..."
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowRefusModal(false); setMotifRefus('') }}
                className="flex-1 rounded-lg border py-3 text-[13px] font-bold transition-all hover:opacity-80"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#ECECEC', color: '#8A8A92' }}>
                Annuler
              </button>
              <button onClick={handleRefuser} disabled={!motifRefus.trim() || actionLoading}
                className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}>
                {actionLoading ? 'Refus en cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
