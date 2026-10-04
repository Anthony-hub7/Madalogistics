import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { chauffeursService } from '../../services/chauffeursService'
import { missionsProposeesService } from '../../services/missionsProposeesService'

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const distanceNum = (m) => (m.distanceKm == null ? null : Number(m.distanceKm))

export default function MissionsProposeesPage() {
  const navigate = useNavigate()
  const [typeChauffeur, setTypeChauffeur] = useState(null)
  const [agenceNom, setAgenceNom] = useState('')
  const [filter, setFilter] = useState('toutes')
  const [missions, setMissions] = useState([])
  const [dismissed, setDismissed] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [actionOnId, setActionOnId] = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await missionsProposeesService.lister()
      setMissions(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Impossible de charger les missions proposees')
      setMissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Recuperer le type de chauffeur puis, si freelance, les missions ouvertes
  useEffect(() => {
    let actif = true
    chauffeursService.monStatutDossier()
      .then(data => {
        if (!actif) return
        setTypeChauffeur(data?.typeChauffeur || 'FREELANCE')
        setAgenceNom(data?.agenceNom || '')
        if ((data?.typeChauffeur || 'FREELANCE') === 'FREELANCE') charger()
        else setLoading(false)
      })
      .catch(() => {
        if (!actif) return
        setTypeChauffeur('FREELANCE')
        charger()
      })
    return () => { actif = false }
  }, [charger])

  const isFreelance = typeChauffeur === 'FREELANCE'

  const visibles = missions.filter(m => !dismissed.includes(m.sacId))

  const filtered = visibles.filter(m => {
    if (filter === 'toutes') return true
    const d = distanceNum(m)
    if (d == null) return false
    if (filter === 'court') return d <= 30
    if (filter === 'long') return d > 30
    return true
  })

  const compte = (pred) => visibles.filter(pred).length
  const nbTotal = visibles.length
  const nbCourt = compte(m => { const d = distanceNum(m); return d != null && d <= 30 })
  const nbLong = compte(m => { const d = distanceNum(m); return d != null && d > 30 })

  const handleAccept = async (m) => {
    setActionOnId({ id: m.sacId, type: 'accept' })
    try {
      const res = await missionsProposeesService.accepter(m.sacId)
      setMissions(prev => prev.filter(x => x.sacId !== m.sacId))
      if (res?.avertissement) {
        setFeedback({ type: 'warn', message: res.avertissement })
      } else {
        setFeedback({
          type: 'ok',
          message: 'Mission attribuee a vous. Itineraire calcule — retrouvez-la dans « Mes missions ».',
        })
      }
    } catch (e) {
      setFeedback({
        type: 'error',
        message: e.message || 'Attribution impossible (mission deja prise ou non eligible).',
      })
      await charger()
    } finally {
      setActionOnId(null)
    }
  }

  const handleRefuse = (sacId) => {
    setDismissed(prev => [...prev, sacId])
  }

  // Si RATTACHE : afficher un message d'information
  if (!isFreelance) {
    return (
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-stamp text-[10px] uppercase font-bold px-2 py-0.5 rounded border-2 text-[#1A1A1E] border-[#1A1A1E] bg-[#F7F7F8]">
                  ★ RATTACHÉ
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E] mt-1">
                Missions assignées
              </h2>
            </div>
          </div>
          <p className="font-body text-sm text-[#8A8A92]">
            Vos missions vous sont assignées directement par votre agence.
          </p>
        </section>

        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed border-[#ECECEC] bg-white">
          <div className="h-20 w-20 rounded-full border-2 border-dashed border-[#1A1A1E] flex items-center justify-center bg-white">
            <span className="material-symbols-outlined text-[36px] text-[#1A1A1E]">assignment</span>
          </div>
          <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[#1A1A1E] mt-6">
            Missions assignées par {agenceNom || 'votre agence'}
          </h3>
          <p className="font-body text-sm text-[#8A8A92] mt-1.5 max-w-xs">
            Vos missions apparaissent directement dans « Mes missions ».
            Pas besoin d'accepter — elles vous sont attribuées automatiquement.
          </p>
          <button onClick={() => navigate('/driver/missions')}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-[#E8433D] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[18px]">route</span>
            Voir mes missions
          </button>
        </div>
      </div>
    )
  }

  // Freelance : afficher les missions proposees
  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-stamp text-[10px] uppercase font-bold px-2 py-0.5 rounded border-2 text-[#E8433D] border-[#E8433D] bg-[#E8433D]/10">
                ★ FREELANCE
              </span>
              <span className="font-mono text-[10px] text-[#8A8A92] font-bold uppercase tracking-wider">
                RN7 CORRIDOR
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E] mt-1">
              Missions proposées
            </h2>
          </div>
          <div className={`px-3 py-1.5 rounded-full font-stamp text-xs font-bold tracking-wide ${
            nbTotal > 0
              ? 'bg-[#E8433D] text-white shadow-md'
              : 'bg-[#ECECEC] text-[#8A8A92]'
          }`}>
            {nbTotal}
          </div>
        </div>
        <p className="font-body text-sm text-[#8A8A92]">
          Propositions de toutes les agences de la plateforme. Choisissez les missions qui vous intéressent.
        </p>
      </section>

      {/* Feedback attribution */}
      {feedback && (
        <div className={`flex items-start gap-3 rounded-lg border-2 p-3.5 ${
          feedback.type === 'error'
            ? 'border-[#E8433D] bg-[#E8433D]/10'
            : feedback.type === 'warn'
              ? 'border-[#E8A233] bg-[#E8A233]/10'
              : 'border-[#2FA84F] bg-[#2FA84F]/10'
        }`}>
          <span className={`material-symbols-outlined text-[20px] mt-0.5 flex-shrink-0 ${
            feedback.type === 'error' ? 'text-[#E8433D]' : feedback.type === 'warn' ? 'text-[#E8A233]' : 'text-[#2FA84F]'
          }`}>
            {feedback.type === 'error' ? 'error' : feedback.type === 'warn' ? 'warning' : 'check_circle'}
          </span>
          <p className="font-body text-xs text-[#1A1A1E] leading-relaxed flex-1">{feedback.message}</p>
          <button onClick={() => setFeedback(null)} className="text-[#8A8A92] hover:text-[#1A1A1E]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Warning freelance */}
      <div className="flex items-start gap-3 rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3.5">
        <span className="material-symbols-outlined text-[20px] text-[#E8433D] mt-0.5 flex-shrink-0">tips_and_updates</span>
        <div>
          <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-0.5">
            Mode Freelance — Toutes agences
          </p>
          <p className="font-body text-xs text-[#1A1A1E] leading-relaxed">
            Vous recevez des missions de <strong>toutes les agences</strong> de la plateforme.
            Taux de commission plateforme : 8% / mission.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'toutes', label: 'Toutes', count: nbTotal, icon: 'receipt_long' },
          { key: 'court', label: 'Courte (< 30 km)', count: nbCourt, icon: 'near_me' },
          { key: 'long', label: 'Longue (> 30 km)', count: nbLong, icon: 'route' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 font-display text-[11px] font-bold uppercase tracking-wide transition-all
              ${filter === f.key
                ? 'border-[#E8433D] bg-[#E8433D] text-white shadow-sm'
                : 'border-[#ECECEC] bg-white text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E]'}`}>
            <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
            {f.label}
            <span className={`ml-0.5 px-1.5 rounded ${
              filter === f.key ? 'bg-white/20 text-white' : 'bg-[#F7F7F8] text-[#8A8A92]'
            }`}>{f.count}</span>
          </button>
        ))}
        <button onClick={charger} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-[#ECECEC] bg-white font-display text-[11px] font-bold uppercase tracking-wide text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E] transition-all disabled:opacity-50">
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Rafraîchir
        </button>
      </div>

      {/* Chargement / erreur */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-[#ECECEC] bg-white">
          <span className="material-symbols-outlined text-[24px] text-[#E8433D] animate-spin">progress_activity</span>
          <p className="font-body text-sm text-[#8A8A92]">Chargement des missions ouvertes…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 rounded-lg border-2 border-[#E8433D] bg-[#E8433D]/10 p-3.5">
          <span className="material-symbols-outlined text-[20px] text-[#E8433D] mt-0.5 flex-shrink-0">cloud_off</span>
          <p className="font-body text-xs text-[#1A1A1E] leading-relaxed flex-1">{error}</p>
          <button onClick={charger} className="font-display text-[11px] font-bold uppercase tracking-wider text-[#E8433D]">
            Réessayer
          </button>
        </div>
      )}

      {/* Missions list */}
      {!loading && !error && (
      <div className="space-y-4">
        {filtered.map((m) => {
          const acting = actionOnId?.id === m.sacId
          const actingType = actionOnId?.type
          const motifs = Array.isArray(m.motifsIneligibles) ? m.motifsIneligibles : []
          const nonEligible = m.eligible === false
          return (
            <article key={m.sacId}
              className={`rounded-xl border-2 border-[#ECECEC] bg-white shadow-sm overflow-hidden relative transition-all duration-300 ${
                acting ? (actingType === 'accept' ? 'translate-x-2 opacity-60 scale-[0.99] border-[#E8433D]/50' : '-translate-x-2 opacity-0 scale-95') : ''
              }`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#E8433D]" />
              <div className="flex items-center justify-between border-b border-[#ECECEC] bg-[#F7F7F8] px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#1A1A1E] bg-white font-stamp text-[11px] font-bold text-[#1A1A1E]">
                    {(m.agenceNom || 'AG').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-stamp text-[10px] uppercase font-bold tracking-widest text-[#8A8A92]">
                      Agence émettrice
                    </p>
                    <p className="font-display text-sm font-bold uppercase tracking-wide text-[#1A1A1E]">{m.agenceNom || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {nonEligible && (
                    <span className="font-stamp text-[9px] uppercase font-bold px-2 py-0.5 rounded border-2 border-[#E8A233] text-[#E8A233] bg-[#E8A233]/10">
                      Non éligible
                    </span>
                  )}
                  <span className="license-plate-tag text-[11px]">{(m.sacId || '').substring(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-[#E8433D]" />
                    <div className="h-10 w-0.5 border-l-2 border-dashed border-[#ECECEC]" />
                    <div className="h-3 w-3 rounded-full border-2 border-[#1A1A1E] bg-white" />
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <div>
                      <p className="font-stamp text-[9px] uppercase tracking-widest text-[#8A8A92] mb-0.5">DÉPART</p>
                      <p className="font-body text-sm font-semibold text-[#1A1A1E]">{m.hubNom || '—'}</p>
                    </div>
                    <div>
                      <p className="font-stamp text-[9px] uppercase tracking-widest text-[#8A8A92] mb-0.5">LIVRAISON · {m.clientNom || 'Client'}</p>
                      <p className="font-body text-sm font-semibold text-[#1A1A1E]">{m.adresseLivraison || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">monitor_weight</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">{m.poidsKg ?? 0} kg</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">inventory_2</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">{m.volumeM3 ?? 0} m³</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">schedule</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">Départ · {fmtDate(m.dateDepartPrevue)}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">route</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">
                      {m.distanceKm == null ? 'Distance —' : `${m.distanceKm} km`}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">category</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">
                      {m.categorieDominante || 'STANDARD'} · {m.nbColis ?? 0} colis
                    </span>
                  </div>
                </div>

                {nonEligible && motifs.length > 0 && (
                  <div className="rounded-lg border-2 border-[#E8A233]/40 bg-[#E8A233]/10 p-3">
                    <p className="font-display text-[10px] uppercase font-bold tracking-wider text-[#E8A233] mb-1">
                      Non attribuable à votre véhicule
                    </p>
                    <ul className="font-body text-xs text-[#1A1A1E] space-y-0.5">
                      {motifs.map((motif, i) => (
                        <li key={i}>• {motif}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t-2 border-dashed border-[#ECECEC] pt-3.5 flex items-end justify-between">
                  <div>
                    <p className="font-stamp text-[9px] uppercase tracking-widest text-[#8A8A92] mb-0.5">Rémunération estimée</p>
                    <p className="font-display text-xl font-bold tabular-nums text-[#E8433D]">
                      {m.remunerationEstimee != null
                        ? Number(m.remunerationEstimee).toLocaleString('fr-FR')
                        : '—'}
                      <span className="text-[#8A8A92] text-xs ml-1">AR</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRefuse(m.sacId)}
                      disabled={!!acting}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-[#ECECEC] bg-white font-display text-xs font-bold uppercase tracking-wider text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E] active:scale-[0.96] transition-all disabled:opacity-50">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      Refuser
                    </button>
                    <button
                      onClick={() => handleAccept(m)}
                      disabled={!!acting || nonEligible}
                      title={nonEligible ? 'Capacité ou droits insuffisants pour cette mission' : undefined}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#E8433D] font-display text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#B82823] active:scale-[0.96] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {acting ? 'progress_activity' : 'check_circle'}
                      </span>
                      {acting ? 'Attribution…' : 'Accepter'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed border-[#ECECEC] bg-white">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#E8433D]/10 animate-ping" style={{ animationDuration: '2.5s' }} />
            <div className="h-20 w-20 rounded-full border-2 border-dashed border-[#E8433D] flex items-center justify-center relative z-10 bg-white">
              <span className="material-symbols-outlined text-[36px] text-[#E8433D]">content_paste_off</span>
            </div>
          </div>
          <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[#1A1A1E] mt-6">
            Plus de missions disponibles
          </h3>
          <p className="font-body text-sm text-[#8A8A92] mt-1.5 max-w-xs">
            Aucune nouvelle proposition pour le moment. Revenez plus tard ou consultez les missions acceptées.
          </p>
          <button onClick={() => navigate('/driver/missions')}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-[#E8433D] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[18px]">route</span>
            Voir mes missions
          </button>
        </div>
      )}
    </div>
  )
}
