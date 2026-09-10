import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { chauffeursService } from '../../services/chauffeursService'

/**
 * Ecran "Votre compte n'est pas encore active".
 * Meme style que NotificationResult (refuse) dans ChauffeurInscriptionFlow.
 * Affiche pour EN_ATTENTE, DESACTIVEE, REFUSEE.
 */
export default function CompteNonActivePage() {
  const navigate = useNavigate()
  const { user, logout, refreshMonStatut } = useAuth()
  const [statut, setStatut] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const fetchStatut = useCallback(async () => {
    try {
      const data = await chauffeursService.monStatutDossier()
      setStatut(data)
    } catch {
      if (user?.statutDossier) {
        setStatut({
          statutDossier: user.statutDossier,
          motifRefus: user.motifRefus || '',
          typeChauffeur: user.typeChauffeur || '',
          agenceNom: user.agenceNom || '',
          chauffeurId: '',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStatut()
  }, [fetchStatut])

  const handleRecheck = async () => {
    setChecking(true)
    const data = await refreshMonStatut()
    setStatut(data)
    setChecking(false)
    // Si le dossier est maintenant active, rediriger vers les missions
    if (data?.statutDossier === 'VALIDEE') {
      navigate('/driver/missions_proposees', { replace: true })
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const statutDossier = statut?.statutDossier || user?.statutDossier || 'EN_ATTENTE'
  const motifRefus = statut?.motifRefus || user?.motifRefus || ''
  const agenceNom = statut?.agenceNom || user?.agenceNom || 'votre agence'
  const isRefusee = statutDossier === 'REFUSEE'
  const isDesactivee = statutDossier === 'DESACTIVEE'

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#E8433D]">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#F7F7F8] text-[#1A1A1E] p-4 md:p-6">
      {/* Background filigree */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="freight-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1A1A1E" strokeWidth="1" strokeDasharray="3 3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#freight-grid)" />
        </svg>
      </div>

      <main className="relative z-10 flex w-full max-w-[480px] flex-col items-center space-y-6 my-auto">

        {/* Timbre rond */}
        <div className={`h-44 w-44 rounded-full border-4 border-solid flex items-center justify-center shadow-xl
          ${isRefusee ? 'border-[#E8433D] bg-white rotate-[6deg]' : 'border-[#1A1A1E] bg-white rotate-[-6deg]'}`}>
          <div className="text-center">
            <span className={`material-symbols-outlined text-[44px] ${isRefusee ? 'text-[#E8433D]' : 'text-[#1A1A1E]'}`}>
              {isRefusee ? 'person_cancel' : isDesactivee ? 'block' : 'pending_actions'}
            </span>
            <p className={`font-stamp text-[10px] uppercase font-bold leading-tight mt-1 ${isRefusee ? 'text-[#E8433D]' : 'text-[#1A1A1E]'}`}>
              {isRefusee ? 'CANDIDATURE\nREFUSEE' : isDesactivee ? 'COMPTE\nDESACTIVE' : 'COMPTE\nNON ACTIVE'}
            </p>
          </div>
        </div>

        <div className="space-y-4 w-full text-center">
          <span className="stamp-badge stamp-badge-red font-stamp text-xs">
            {isRefusee ? 'REFUS PAR ' + (agenceNom !== 'votre agence' ? agenceNom.toUpperCase() : "L'AGENCE")
              : isDesactivee ? 'COMPTE DESACTIVE'
              : 'EN ATTENTE DE VALIDATION'}
          </span>

          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            {isRefusee ? 'Candidature non retenue'
              : isDesactivee ? 'Votre compte a été désactivé'
              : "Votre compte n'est pas encore activé"}
          </h1>

          <p className="font-body text-base text-[#8A8A92] max-w-md mx-auto">
            {isRefusee ? (
              <>L'agence <strong className="text-[#1A1A1E]">{agenceNom}</strong> n'a pas retenu votre profil pour le moment.</>
            ) : isDesactivee ? (
              <>Votre compte a été désactivé par l'agence <strong className="text-[#1A1A1E]">{agenceNom}</strong>.</>
            ) : (
              <>Votre dossier est en attente de validation par l'agence <strong className="text-[#1A1A1E]">{agenceNom}</strong>. Vous serez notifié par email.</>
            )}
          </p>
        </div>

        {/* Motif refus */}
        {isRefusee && motifRefus && (
          <div className="w-full max-w-md rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-4 text-left">
            <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-2">
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">report</span>
              Motif communiqué par l'agence
            </p>
            <p className="font-body text-sm text-[#1A1A1E]">{motifRefus}</p>
          </div>
        )}

        {/* Timeline attente */}
        {!isRefusee && (
          <div className="w-full max-w-md rounded-xl border-2 border-[#ECECEC] bg-white p-6 text-left space-y-4">
            <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92]">Étapes de validation</p>
            {[
              { icon: 'check_circle', label: "Candidature reçue par l'agence", done: true },
              { icon: 'manage_search', label: `Examen par ${agenceNom !== 'votre agence' ? agenceNom : "l'agence"}`, done: false, active: true },
              { icon: 'mark_email_read', label: 'Notification de décision', done: false },
              { icon: 'directions_car', label: 'Activation & premières missions', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[22px] ${step.done ? 'text-[#1A1A1E]' : step.active ? 'text-[#E8433D] animate-pulse' : 'text-[#ECECEC]'}`}>
                  {step.icon}
                </span>
                <span className={`font-body text-sm ${step.done ? 'text-[#1A1A1E] font-semibold' : step.active ? 'text-[#E8433D] font-semibold' : 'text-[#8A8A92]'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Boutons */}
        <div className="w-full max-w-md space-y-3">
          {!isRefusee && (
            <button onClick={handleRecheck} disabled={checking}
              className="flex items-center justify-center gap-2 w-full rounded bg-[#E8433D] px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-60">
              <span className={`material-symbols-outlined text-[18px] ${checking ? 'animate-spin' : ''}`}>
                {checking ? 'progress_activity' : 'refresh'}
              </span>
              {checking ? 'Vérification...' : 'Vérifier à nouveau'}
            </button>
          )}

          {isRefusee && (
            <a href="/inscription/chauffeur"
              className="flex items-center justify-center gap-2 w-full rounded bg-[#E8433D] px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823]">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Postuler dans une autre agence
            </a>
          )}

          <button onClick={handleLogout}
            className="w-full font-display text-sm font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors underline underline-offset-4 py-2">
            ← Retour à la connexion
          </button>
        </div>
      </main>

      <footer className="relative z-10 w-full text-center font-display text-xs uppercase tracking-wider text-[#8A8A92] flex flex-col sm:flex-row items-center justify-between gap-2 pt-4">
        <p>&copy; 2026 MadaLogistix. Fret & Groupage Madagascar.</p>
      </footer>
    </div>
  )
}
