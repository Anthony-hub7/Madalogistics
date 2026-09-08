import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'

const statutConfig = {
  EN_ATTENTE: { label: 'EN ATTENTE', bg: '#F7F7F8', color: '#8A8A92', border: '#ECECEC' },
  VALIDEE: { label: 'VALIDEE', bg: '#E8F5E9', color: '#1A1A1E', border: '#1A1A1E' },
  REFUSEE: { label: 'REFUSEE', bg: '#FDE8E6', color: '#E8433D', border: '#E8433D' },
}

export default function AgencesDemandesPage() {
  const navigate = useNavigate()
  const onNavigate = (key, data) => navigate(`/admin/${key}`, { state: data })
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDemande, setSelectedDemande] = useState(null)
  const [showRefusModal, setShowRefusModal] = useState(false)
  const [motifRefus, setMotifRefus] = useState('')

  const fetchDemandes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.listAgences('EN_ATTENTE')
      setDemandes(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des demandes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDemandes() }, [])

  const handleValider = async (tenantId) => {
    try {
      await adminService.validerAgence(tenantId)
      setDemandes(prev => prev.filter(d => d.tenantId !== tenantId))
    } catch (err) {
      alert(err.message || 'Erreur lors de la validation')
    }
  }

  const handleRefuser = async () => {
    if (!selectedDemande || !motifRefus.trim()) return
    try {
      await adminService.refuserAgence(selectedDemande.tenantId, motifRefus.trim())
      setDemandes(prev => prev.filter(d => d.tenantId !== selectedDemande.tenantId))
      setShowRefusModal(false)
      setSelectedDemande(null)
      setMotifRefus('')
    } catch (err) {
      alert(err.message || 'Erreur lors du refus')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            Demandes d'agences en attente
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#E8433D]/20 border-t-[#E8433D] rounded-full animate-spin" />
            <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              Chargement des demandes...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            Demandes d'agences en attente
          </h1>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: '#E8433D', backgroundColor: '#FDE8E6' }}>
          <span className="material-symbols-outlined text-[40px]" style={{ color: '#E8433D' }}>error</span>
          <p className="font-body text-body-md mt-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#E8433D' }}>
            {error}
          </p>
          <button
            onClick={fetchDemandes}
            className="mt-4 rounded-lg px-4 py-2 text-[13px] font-bold transition-all hover:opacity-80"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D', color: '#FFFFFF' }}
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            Demandes d'agences en attente
          </h1>
          <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
            {demandes.length} demande{demandes.length > 1 ? 's' : ''} en attente de validation
          </p>
        </div>
      </div>

      {demandes.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <span className="material-symbols-outlined text-[48px]" style={{ color: '#ECECEC' }}>apartment</span>
          <p className="font-body text-body-md mt-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
            Aucune demande d'agence en attente
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {demandes.map((d) => (
            <div key={d.tenantId} className="rounded-xl border p-5 transition-all hover:shadow-sm" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
                    <span className="material-symbols-outlined text-[24px]" style={{ color: '#E8433D' }}>apartment</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-body-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>
                        {d.nomEntreprise}
                      </h3>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: statutConfig[d.statutDossier]?.bg, color: statutConfig[d.statutDossier]?.color, border: `1px solid ${statutConfig[d.statutDossier]?.border}` }}>
                        {statutConfig[d.statutDossier]?.label || d.statutDossier}
                      </span>
                    </div>
                    <p className="font-body text-body-sm mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                      {d.nif && `NIF: ${d.nif}`} {d.stat && `• STAT: ${d.stat}`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                      {d.adresse && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          {d.adresse}
                        </span>
                      )}
                      {d.telephone && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">phone</span>
                          {d.telephone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 md:flex-row md:items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedDemande(d)
                        setShowRefusModal(true)
                      }}
                      className="rounded-lg border px-4 py-2 text-[13px] font-bold transition-all hover:opacity-80"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#E8433D', color: '#E8433D', backgroundColor: 'transparent' }}
                    >
                      Refuser
                    </button>
                    <button
                      onClick={() => handleValider(d.tenantId)}
                      className="rounded-lg px-4 py-2 text-[13px] font-bold text-white transition-all hover:opacity-90"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}
                    >
                      Approuver
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <span className="font-label text-label-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>
                  Documents joints :
                </span>
                {d.hasKbis && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#E8F5E9', color: '#1A1A1E' }}>
                    Registre de commerce ✓
                  </span>
                )}
                {d.hasAttestation && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#E8F5E9', color: '#1A1A1E' }}>
                    Attestation MTPM ✓
                  </span>
                )}
                {d.hasAssurance && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#E8F5E9', color: '#1A1A1E' }}>
                    Assurance flotte ✓
                  </span>
                )}
                {!d.hasKbis && !d.hasAttestation && !d.hasAssurance && (
                  <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#FDE8E6', color: '#E8433D' }}>
                    Aucun document
                  </span>
                )}
                <button
                  onClick={() => onNavigate('agence_detail', { tenantId: d.tenantId, fromDemandes: true })}
                  className="ml-auto rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8433D' }}
                >
                  Vérifier le profil →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRefusModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowRefusModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 pb-10 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="mx-auto mb-6 h-1 w-10 rounded-full" style={{ backgroundColor: '#ECECEC' }} />
            <h3 className="font-display text-headline-md mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Refuser la demande
            </h3>
            <p className="font-body text-body-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              {selectedDemande?.nomEntreprise} — Motif du refus obligatoire
            </p>
            <textarea
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              className="mb-4 w-full rounded-xl border p-4 font-body text-body-md outline-none focus:ring-2 focus:ring-red-500/20"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderColor: '#ECECEC', backgroundColor: '#F7F7F8', color: '#1A1A1E' }}
              placeholder="Ex: Documents incomplets, zone non couverte..."
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRefusModal(false); setMotifRefus(''); setSelectedDemande(null) }}
                className="flex-1 rounded-lg border py-3 text-[13px] font-bold transition-all hover:opacity-80"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#ECECEC', color: '#8A8A92' }}
              >
                Annuler
              </button>
              <button
                onClick={handleRefuser}
                disabled={!motifRefus.trim()}
                className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
