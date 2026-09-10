import { useState, useEffect, useCallback } from 'react'
import { agenceEquipeService } from '../../services/agenceEquipeService'
import EquipeTab from './EquipeTab'

const STATUT_CONFIG = {
  EN_ATTENTE: { label: 'EN ATTENTE', bg: '#F7F7F8', color: '#8A8A92', border: '#ECECEC' },
  VALIDEE: { label: 'ACTIVE', bg: '#F7F7F8', color: '#1A1A1E', border: '#1A1A1E' },
  REFUSEE: { label: 'REFUSEE', bg: '#FDE8E6', color: '#E8433D', border: '#E8433D' },
  DESACTIVEE: { label: 'DESACTIVE', bg: '#F7F7F8', color: '#8A8A92', border: '#ECECEC' },
}

function AttenteTab({ onRefresh }) {
  const [chauffeurs, setChauffeurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [modalAction, setModalAction] = useState(null)
  const [motifRefus, setMotifRefus] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [permisUrl, setPermisUrl] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agenceEquipeService.lister('EN_ATTENTE')
      setChauffeurs(data)
      setError('')
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openRefuser = (c) => { setSelected(c); setModalAction('refuser'); setMotifRefus('') }
  const openValider = (c) => { setSelected(c); setModalAction('valider') }

  const handleConfirm = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      if (modalAction === 'valider') {
        await agenceEquipeService.valider(selected.chauffeurId)
      } else if (modalAction === 'refuser') {
        if (!motifRefus.trim()) { setActionLoading(false); return }
        await agenceEquipeService.refuser(selected.chauffeurId, motifRefus.trim())
      }
      setSelected(null); setModalAction(null)
      fetchData()
      onRefresh?.()
    } catch (err) {
      setError(err.message || 'Erreur action')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePreviewPermis = async (c) => {
    try {
      const url = await agenceEquipeService.fetchPermis(c.chauffeurId)
      setPermisUrl(url)
    } catch { setPermisUrl(null) }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-[#E8433D]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-3xl text-[#E8433D]">progress_activity</span>
        </div>
      ) : chauffeurs.length === 0 ? (
        <div className="py-12 text-center text-[#8A8A92]">
          <span className="material-symbols-outlined text-5xl opacity-30">check_circle</span>
          <p className="font-body text-sm mt-2">Aucune demande en attente</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border-2 border-[#ECECEC] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[#ECECEC] bg-[#F7F7F8]">
                  <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Chauffeur</th>
                  <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Contact</th>
                  <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Permis</th>
                  <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Véhicule</th>
                  <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Type</th>
                  <th className="px-6 py-4 text-right font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC]/70">
                {chauffeurs.map((c) => {
                  const st = STATUT_CONFIG[c.statutDossier] || STATUT_CONFIG.EN_ATTENTE
                  const nom = c.nom || '—'
                  const prenom = c.email?.split('@')[0] || ''
                  const initiales = nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <tr key={c.chauffeurId} className="transition-colors hover:bg-[#F7F7F8]/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8433D] text-white font-stamp text-sm font-bold">
                            {initiales}
                          </div>
                          <div>
                            <p className="font-display text-base font-bold text-[#1A1A1E] uppercase tracking-wide">{nom}</p>
                            <p className="font-body text-xs text-[#8A8A92]">CIN {c.cin || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-body text-sm text-[#1A1A1E]">{c.email}</p>
                        <p className="font-body text-xs text-[#8A8A92]">{c.telephone || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-body text-sm text-[#1A1A1E]">Cat. {c.permisCategorie || '—'}</p>
                        {c.hasPermisScan && (
                          <button onClick={() => handlePreviewPermis(c)}
                            className="font-body text-xs text-[#E8433D] hover:underline">Voir scan</button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {c.immatriculation ? (
                          <div>
                            <span className="license-plate-tag text-[11px]">{c.immatriculation}</span>
                            <p className="font-body text-xs text-[#8A8A92] mt-0.5">{c.typeVehicule || '—'}</p>
                          </div>
                        ) : (
                          <span className="font-body text-xs text-[#8A8A92]">À assigner</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openValider(c)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[#1A1A1E] bg-[#1A1A1E] font-display text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#333] transition-all">
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            Valider
                          </button>
                          <button onClick={() => openRefuser(c)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[#E8433D]/50 bg-white font-display text-[11px] font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 hover:border-[#E8433D] transition-all">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Refuser
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal */}
      {modalAction && selected && (
        <>
          <div className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-[2px]" onClick={() => { setSelected(null); setModalAction(null) }} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
            <div className="rounded-xl border-2 border-[#ECECEC] bg-white shadow-2xl overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${modalAction === 'valider' ? 'bg-[#1A1A1E]' : 'bg-[#E8433D]'}`} />
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${modalAction === 'valider' ? 'bg-[#1A1A1E]/10 border-2 border-[#1A1A1E]/30' : 'bg-[#E8433D]/10 border-2 border-[#E8433D]/30'}`}>
                    <span className={`material-symbols-outlined text-[24px] ${modalAction === 'valider' ? 'text-[#1A1A1E]' : 'text-[#E8433D]'}`}>
                      {modalAction === 'valider' ? 'how_to_reg' : 'person_cancel'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight text-[#1A1A1E]">
                      {modalAction === 'valider' ? 'Valider le chauffeur' : 'Refuser le chauffeur'}
                    </h3>
                    <p className="font-body text-sm text-[#8A8A92] mt-1">
                      {modalAction === 'valider'
                        ? <>Confirmer la validation de <strong className="text-[#1A1A1E]">{selected.nom}</strong> ?</>
                        : <>Motif du refus pour <strong className="text-[#1A1A1E]">{selected.nom}</strong> ?</>}
                    </p>
                  </div>
                </div>

                {modalAction === 'refuser' && (
                  <textarea value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)}
                    placeholder="Motif obligatoire..."
                    className="w-full rounded-lg border-2 border-[#ECECEC] bg-[#F7F7F8] p-3 font-body text-sm text-[#1A1A1E] outline-none focus:border-[#E8433D] resize-none h-24" />
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setSelected(null); setModalAction(null) }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-[#ECECEC] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
                    <span className="material-symbols-outlined text-[18px]">close</span> Annuler
                  </button>
                  <button onClick={handleConfirm} disabled={actionLoading || (modalAction === 'refuser' && !motifRefus.trim())}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50
                      ${modalAction === 'valider' ? 'bg-[#1A1A1E] hover:bg-[#333]' : 'bg-[#E8433D] hover:bg-[#B82823]'}`}>
                    {actionLoading ? 'En cours...' : modalAction === 'valider' ? 'Confirmer validation' : 'Confirmer refus'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Preview permis */}
      {permisUrl && (
        <>
          <div className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-[2px]" onClick={() => setPermisUrl(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
            <div className="rounded-xl border-2 border-[#ECECEC] bg-white shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E]">Scan du permis</h3>
                  <button onClick={() => setPermisUrl(null)} className="p-1 rounded hover:bg-[#F7F7F8]">
                    <span className="material-symbols-outlined text-[20px] text-[#8A8A92]">close</span>
                  </button>
                </div>
                <img src={permisUrl} alt="Permis" className="w-full rounded-lg border border-[#ECECEC]" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}



const TABS = [
  { key: 'attente', label: 'En attente', icon: 'pending_actions' },
  { key: 'membres', label: 'Équipe', icon: 'group' },
]

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState('attente')
  const [countAttente, setCountAttente] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const data = await agenceEquipeService.lister('EN_ATTENTE')
      setCountAttente(data.length)
    } catch {}
  }, [])

  useEffect(() => { fetchCount() }, [fetchCount])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Équipe</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Gestion des chauffeurs et des rôles de l'agence.
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b-2 border-[#ECECEC] pb-0">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 font-display text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all
              ${activeTab === tab.key
                ? 'border-[#E8433D] text-[#E8433D]'
                : 'border-transparent text-[#8A8A92] hover:text-[#1A1A1E] hover:border-[#ECECEC]'}`}>
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
            {tab.key === 'attente' && countAttente > 0 && (
              <span className="px-1.5 rounded-full text-[10px] bg-[#E8433D] text-white font-bold">{countAttente}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'attente' && <AttenteTab onRefresh={fetchCount} />}
      {activeTab === 'membres' && <EquipeTab />}
    </div>
  )
}
