import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'

export default function AgencesListePage() {
  const navigate = useNavigate()
  const onNavigate = (key, data) => navigate(`/admin/${key}`, { state: data })
  const [agences, setAgences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [onglet, setOnglet] = useState('active')
  const [selectedAgence, setSelectedAgence] = useState(null)
  const [modalAction, setModalAction] = useState(null)
  const [motif, setMotif] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAgences = async (statut = 'VALIDEE') => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.listAgences(statut)
      setAgences(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des agences')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgences(onglet === 'active' ? 'VALIDEE' : 'DESACTIVEE')
  }, [onglet])

  const filtered = agences.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (a.nomEntreprise && a.nomEntreprise.toLowerCase().includes(q)) ||
      (a.nif && a.nif.toLowerCase().includes(q)) ||
      (a.telephone && a.telephone.toLowerCase().includes(q)) ||
      (a.adresse && a.adresse.toLowerCase().includes(q))
    )
  })

  const now = new Date()
  const thisMonth = agences.filter(a => {
    if (!a.createdAt) return false
    const d = new Date(a.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const dossiersComplets = agences.filter(a => a.hasKbis && a.hasAttestation).length

  const openModal = (agence, action) => {
    setSelectedAgence(agence)
    setModalAction(action)
    setMotif('')
  }

  const closeModal = () => {
    setSelectedAgence(null)
    setModalAction(null)
    setMotif('')
    setActionLoading(false)
  }

  const handleAction = async () => {
    if (!selectedAgence || !modalAction) return
    setActionLoading(true)
    try {
      if (modalAction === 'desactiver') {
        await adminService.desactiverAgence(selectedAgence.tenantId, motif || 'Desactive par l\'administrateur')
      } else if (modalAction === 'supprimer') {
        await adminService.supprimerAgence(selectedAgence.tenantId, motif || 'Supprime par l\'administrateur')
      } else if (modalAction === 'reactiver') {
        await adminService.reactiverAgence(selectedAgence.tenantId)
      }
      setAgences(prev => prev.filter(a => a.tenantId !== selectedAgence.tenantId))
      closeModal()
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'action')
      setActionLoading(false)
    }
  }

  const tabStyle = (active) => ({
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.5px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: `2px solid ${active ? '#E8433D' : '#ECECEC'}`,
    backgroundColor: active ? '#E8433D' : 'transparent',
    color: active ? '#FFFFFF' : '#8A8A92',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            Agences
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#E8433D]/20 border-t-[#E8433D] rounded-full animate-spin" />
            <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              Chargement des agences...
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
            Agences
          </h1>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: '#E8433D', backgroundColor: '#FDE8E6' }}>
          <span className="material-symbols-outlined text-[40px]" style={{ color: '#E8433D' }}>error</span>
          <p className="font-body text-body-md mt-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#E8433D' }}>
            {error}
          </p>
          <button
            onClick={() => fetchAgences(onglet === 'active' ? 'VALIDEE' : 'DESACTIVEE')}
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
            Agences
          </h1>
          <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
            {agences.length} agence{agences.length > 1 ? 's' : ''} {onglet === 'active' ? 'active(s)' : 'désactivée(s)'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => { setOnglet('active'); setSearch('') }} style={tabStyle(onglet === 'active')}>
          Actives
        </button>
        <button onClick={() => { setOnglet('desactive'); setSearch('') }} style={tabStyle(onglet === 'desactive')}>
          Désactivées
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#E8433D' }}>apartment</span>
            </div>
            {onglet === 'active' && thisMonth > 0 && (
              <span className="text-[13px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>+{thisMonth} ce mois</span>
            )}
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>
            {onglet === 'active' ? 'Total actives' : 'Total désactivées'}
          </p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{agences.length}</p>
        </div>
        {onglet === 'active' && (
          <>
            <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
                  <span className="material-symbols-outlined" style={{ color: '#1A1A1E' }}>verified_user</span>
                </div>
              </div>
              <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Dossiers complets</p>
              <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{dossiersComplets}</p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
                  <span className="material-symbols-outlined" style={{ color: '#8A8A92' }}>description</span>
                </div>
              </div>
              <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Kbis fourni</p>
              <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{agences.filter(a => a.hasKbis).length}</p>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#ECECEC' }}>
          <h2 className="font-display text-headline-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
            {onglet === 'active' ? 'Répertoire des agences' : 'Agences désactivées'}
          </h2>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: '#8A8A92' }}>search</span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border py-2 pl-10 pr-4 text-[13px] outline-none"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderColor: '#ECECEC', backgroundColor: '#F7F7F8', color: '#1A1A1E' }}
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[48px]" style={{ color: '#ECECEC' }}>search_off</span>
            <p className="font-body text-body-md mt-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              {onglet === 'active' ? 'Aucune agence active' : 'Aucune agence désactivée'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: '#ECECEC', backgroundColor: '#F7F7F8' }}>
                  <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Agence</th>
                  <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Contact</th>
                  <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Adresse</th>
                  <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Date</th>
                  <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.tenantId} className="border-b transition-colors hover:opacity-90" style={{ borderColor: '#ECECEC' }}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-body text-body-md font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{a.nomEntreprise}</p>
                        <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>NIF: {a.nif || '—'}</p>
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                      {a.telephone || '—'}
                    </td>
                    <td className="hidden px-6 py-4 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                      {a.adresse || '—'}
                    </td>
                    <td className="hidden px-6 py-4 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate('agence_detail', { tenantId: a.tenantId })}
                          className="rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8433D', border: '1px solid #ECECEC' }}
                        >
                          Voir fiche
                        </button>
                        {onglet === 'active' ? (
                          <>
                            <button
                              onClick={() => openModal(a, 'desactiver')}
                              title="Désactiver cette agence"
                              className="rounded-lg p-1.5 transition-all hover:bg-[#F7F7F8]"
                              style={{ color: '#E8433D' }}
                            >
                              <span className="material-symbols-outlined text-[18px]">block</span>
                            </button>
                            <button
                              onClick={() => openModal(a, 'supprimer')}
                              title="Supprimer cette agence"
                              className="rounded-lg p-1.5 transition-all hover:bg-[#FDE8E6]"
                              style={{ color: '#B82823' }}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openModal(a, 'reactiver')}
                            title="Réactiver cette agence"
                            className="rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80"
                            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', backgroundColor: '#E8F5E9' }}
                          >
                            Réactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAction && selectedAgence && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={closeModal} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 pb-10 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="mx-auto mb-6 h-1 w-10 rounded-full" style={{ backgroundColor: '#ECECEC' }} />
            <h3 className="font-display text-headline-md mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              {modalAction === 'desactiver' ? 'Désactiver l\'agence' : modalAction === 'supprimer' ? 'Supprimer l\'agence' : 'Réactiver l\'agence'}
            </h3>
            <p className="font-body text-body-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              {selectedAgence.nomEntreprise} — {modalAction === 'desactiver' ? 'Le compte sera désactivé et l\'agence ne pourra plus se connecter.' : modalAction === 'supprimer' ? 'Cette action est irréversible. Le compte sera définitivement supprimé.' : 'Le compte sera réactivé et l\'agence retrouvera l\'accès.'}
            </p>
            {modalAction !== 'reactiver' && (
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="mb-4 w-full rounded-xl border p-4 font-body text-body-md outline-none focus:ring-2 focus:ring-red-500/20"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderColor: '#ECECEC', backgroundColor: '#F7F7F8', color: '#1A1A1E' }}
                placeholder={modalAction === 'desactiver' ? 'Raison de la désactivation...' : 'Raison de la suppression...'}
                rows={3}
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-lg border py-3 text-[13px] font-bold transition-all hover:opacity-80"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#ECECEC', color: '#8A8A92' }}
              >
                Annuler
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: modalAction === 'reactiver' ? '#1A1A1E' : modalAction === 'supprimer' ? '#B82823' : '#E8433D' }}
              >
                {actionLoading ? 'En cours...' : modalAction === 'desactiver' ? 'Confirmer la désactivation' : modalAction === 'supprimer' ? 'Confirmer la suppression' : 'Confirmer la réactivation'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
