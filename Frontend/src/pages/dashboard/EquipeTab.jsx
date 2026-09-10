import { useState, useEffect, useCallback } from 'react'
import { usersService } from '../../services/usersService'
import { useAuth } from '../../hooks/useAuth'

const ROLE_LABELS = {
  GESTIONNAIRE: 'Gestionnaire',
  CHAUFFEUR: 'Chauffeur',
  DIRECTION: 'Direction',
  ADMIN_SAAS: 'Admin SaaS',
  CLIENT_FINAL: 'Client',
}

const ROLE_AVATAR_COLORS = {
  GESTIONNAIRE: 'bg-[#E8433D] text-white',
  CHAUFFEUR: 'bg-[#1A1A1E] text-white',
  DIRECTION: 'bg-[#E8433D] text-white',
  ADMIN_SAAS: 'bg-[#8A8A92] text-white',
  CLIENT_FINAL: 'bg-[#ECECEC] text-[#8A8A92] border border-[#ECECEC]',
}

function getInitials(name) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const emptyForm = { nom: '', email: '', password: '' }

function EquipeTab() {
  const { user: currentUser } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [modalAction, setModalAction] = useState(null)
  const [selected, setSelected] = useState(null)
  const [motif, setMotif] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const isDirection = currentUser?.role === 'DIRECTION'

  const fetchData = useCallback(async () => {
    try {
      const res = await usersService.lister(0, 100)
      if (Array.isArray(res?.content)) {
        setMembers(res.content)
      }
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const isSelf = (m) => m.utilisateurId === currentUser?.utilisateurId

  const canManage = (m) => {
    if (isSelf(m)) return false
    if (m.role === 'DIRECTION' || m.role === 'ADMIN_SAAS') return false
    return true
  }

  const handleCreate = async () => {
    if (!createForm.nom.trim() || !createForm.email.trim() || !createForm.password.trim()) return
    if (createForm.password.length < 8) {
      setCreateError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    setCreateLoading(true)
    setCreateError('')
    try {
      await usersService.creer({
        nom: createForm.nom.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: 'GESTIONNAIRE',
      })
      setCreateForm(emptyForm)
      setShowCreateForm(false)
      fetchData()
    } catch (err) {
      setCreateError(err.message || 'Erreur de création')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDesactiver = async () => {
    if (!selected) return
    setActionLoading(selected.utilisateurId)
    try {
      await usersService.modifier(selected.utilisateurId, { habiliteValeur: false })
      setSelected(null); setModalAction(null)
      fetchData()
    } catch (err) {
      setError(err.message || 'Erreur désactivation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactiver = async (m) => {
    setActionLoading(m.utilisateurId)
    try {
      await usersService.modifier(m.utilisateurId, { habiliteValeur: true })
      fetchData()
    } catch (err) {
      setError(err.message || 'Erreur réactivation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSupprimer = async () => {
    if (!selected) return
    setActionLoading(selected.utilisateurId)
    try {
      await usersService.supprimer(selected.utilisateurId)
      setSelected(null); setModalAction(null)
      fetchData()
    } catch (err) {
      setError(err.message || 'Erreur suppression')
    } finally {
      setActionLoading(null)
    }
  }

  const openDesactiver = (m) => { setSelected(m); setModalAction('desactiver'); setMotif('') }
  const openSupprimer = (m) => { setSelected(m); setModalAction('supprimer'); setMotif('') }
  const closeModal = () => { setSelected(null); setModalAction(null) }

  const filtered = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (m.nom || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)
  })

  const stats = {
    total: members.length,
    gestionnaires: members.filter(m => m.role === 'GESTIONNAIRE').length,
    chauffeurs: members.filter(m => m.role === 'CHAUFFEUR').length,
    directions: members.filter(m => m.role === 'DIRECTION').length,
    admins: members.filter(m => m.role === 'ADMIN_SAAS').length,
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-[#ECECEC] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#ECECEC] bg-[#F7F7F8] p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-headline-md text-headline-md text-[#1A1A1E]">Gestion de l'Équipe</h2>
            <p className="font-body-sm text-body-sm text-[#8A8A92]">
              Administrez les accès et rôles opérationnels du réseau logistique.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isDirection && (
              <button
                onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(''); setCreateForm(emptyForm) }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 font-label-md text-label-md shadow-sm transition-all ${showCreateForm ? 'bg-[#ECECEC] text-[#8A8A92]' : 'bg-[#E8433D] text-white hover:bg-[#B82823]'}`}
              >
                <span className="material-symbols-outlined text-[18px]">{showCreateForm ? 'close' : 'person_add'}</span>
                {showCreateForm ? 'Annuler' : 'Ajouter un responsable logistique'}
              </button>
            )}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#8A8A92]">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="w-64 rounded-lg border border-[#ECECEC] bg-white py-2 pl-10 pr-4 font-body-sm text-body-sm text-[#1A1A1E] outline-none transition-all focus:border-[#E8433D] focus:ring-2 focus:ring-[#E8433D]/20"
              />
            </div>
          </div>
        </div>

        {showCreateForm && isDirection && (
          <div className="border-b border-[#ECECEC] bg-[#F7F7F8]/50 p-5">
            <h3 className="mb-3 font-label-md text-label-md font-bold text-[#1A1A1E]">Nouveau responsable logistique</h3>
            {createError && (
              <div className="mb-3 rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3 text-center">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-[#E8433D]">{createError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="text"
                value={createForm.nom}
                onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                placeholder="Nom complet"
                className="rounded-lg border-2 border-[#ECECEC] bg-white px-4 py-2.5 font-body text-sm text-[#1A1A1E] outline-none focus:border-[#E8433D]"
              />
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="Email"
                className="rounded-lg border-2 border-[#ECECEC] bg-white px-4 py-2.5 font-body text-sm text-[#1A1A1E] outline-none focus:border-[#E8433D]"
              />
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Mot de passe (min. 8 car.)"
                minLength={8}
                className="rounded-lg border-2 border-[#ECECEC] bg-white px-4 py-2.5 font-body text-sm text-[#1A1A1E] outline-none focus:border-[#E8433D]"
              />
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleCreate}
                disabled={createLoading || !createForm.nom.trim() || !createForm.email.trim() || !createForm.password.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#E8433D] px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50"
              >
                {createLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    Création...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    Créer le compte
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setCreateForm(emptyForm); setCreateError('') }}
                className="rounded-lg border-2 border-[#ECECEC] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E] transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-5 mt-4 rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3 text-center">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-[#E8433D]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#E8433D]">progress_activity</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#8A8A92]">
            <span className="material-symbols-outlined text-5xl opacity-30">group</span>
            <p className="font-body text-sm mt-2">{search ? 'Aucun résultat' : "Aucun utilisateur dans l'équipe"}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-[#ECECEC] bg-[#F7F7F8] text-[#8A8A92]">
                  <tr>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Date d'ajout</th>
                    <th className="px-6 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECEC]/70">
                  {filtered.map((m) => {
                    const avatarColor = ROLE_AVATAR_COLORS[m.role] || 'bg-[#ECECEC] text-[#8A8A92]'
                    const self = isSelf(m)
                    const managed = canManage(m)
                    return (
                      <tr key={m.utilisateurId || m.email} className="transition-colors hover:bg-[#F7F7F8]/60">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold border-2 border-[#ECECEC] ${avatarColor}`}>
                              {getInitials(m.nom)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-body-md text-body-md font-bold text-[#1A1A1E]">{m.nom || '—'}</p>
                                {self && <span className="inline-flex items-center rounded-full bg-[#1A1A1E] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Vous</span>}
                              </div>
                              <p className="font-label-sm text-label-sm text-[#8A8A92]">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-body-sm text-body-sm text-[#8A8A92]">
                          {ROLE_LABELS[m.role] || m.role}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold font-stamp tracking-wide border-2 ${
                            m.habiliteValeur
                              ? 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]'
                              : 'bg-[#F7F7F8] text-[#8A8A92] border-[#ECECEC]'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${m.habiliteValeur ? 'bg-[#1A1A1E] animate-pulse' : 'bg-[#8A8A92]'}`} />
                            {m.habiliteValeur ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-body-sm text-body-sm text-[#8A8A92]">
                          {formatDate(m.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {managed && (
                            <div className="flex items-center justify-end gap-2">
                              {m.habiliteValeur ? (
                                <button onClick={() => openDesactiver(m)}
                                  disabled={actionLoading === m.utilisateurId}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[#E8433D]/50 bg-white font-display text-[11px] font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 hover:border-[#E8433D] transition-all disabled:opacity-50">
                                  <span className="material-symbols-outlined text-[16px]">block</span>
                                  Désactiver
                                </button>
                              ) : (
                                <button onClick={() => handleReactiver(m)}
                                  disabled={actionLoading === m.utilisateurId}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[#1A1A1E] bg-[#1A1A1E] font-display text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#333] transition-all disabled:opacity-50">
                                  <span className={`material-symbols-outlined text-[16px] ${actionLoading === m.utilisateurId ? 'animate-spin' : ''}`}>
                                    {actionLoading === m.utilisateurId ? 'progress_activity' : 'restart_alt'}
                                  </span>
                                  Réactiver
                                </button>
                              )}
                              <button onClick={() => openSupprimer(m)}
                                disabled={actionLoading === m.utilisateurId}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[#E8433D]/30 bg-white font-display text-[11px] font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 transition-all disabled:opacity-50">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#ECECEC] bg-[#F7F7F8] px-6 py-4">
              <p className="font-label-sm text-label-sm text-[#8A8A92]">
                Affichage de 1-{filtered.length} sur {filtered.length} membre{filtered.length > 1 ? 's' : ''} de l'équipe
              </p>
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex h-64 flex-col justify-between overflow-hidden rounded-xl bg-[#E8433D] p-6 text-white shadow-sm lg:col-span-1 relative">
          <div className="relative z-10">
            <h3 className="mb-1 font-label-sm text-label-sm uppercase tracking-widest opacity-90">Total Effectif</h3>
            <p className="font-headline-xl text-headline-xl font-extrabold tabular-nums">{stats.total}</p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between border-b border-white/20 pb-2 font-label-md text-label-md">
                <span>Managers</span>
                <span className="font-bold tabular-nums">{stats.gestionnaires + stats.directions}</span>
              </div>
              <div className="flex justify-between border-b border-white/20 pb-2 font-label-md text-label-md">
                <span>Chauffeurs</span>
                <span className="font-bold tabular-nums">{stats.chauffeurs}</span>
              </div>
              <div className="flex justify-between font-label-md text-label-md">
                <span>Admin</span>
                <span className="font-bold tabular-nums">{stats.admins}</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-10">
            <span className="material-symbols-outlined text-[160px]">group</span>
          </div>
        </div>

        <div className="flex h-64 flex-col rounded-xl border-2 border-[#ECECEC] bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-2 font-headline-md text-headline-md text-[#1A1A1E]">Répartition par rôle</h3>
          <div className="flex flex-1 flex-col justify-center">
            {[
              { label: 'Direction', value: stats.directions, total: stats.total || 1, color: 'bg-[#E8433D]' },
              { label: 'Gestionnaires', value: stats.gestionnaires, total: stats.total || 1, color: 'bg-[#E8433D]/70' },
              { label: 'Chauffeurs', value: stats.chauffeurs, total: stats.total || 1, color: 'bg-[#1A1A1E]' },
              { label: 'Admin SaaS', value: stats.admins, total: stats.total || 1, color: 'bg-[#8A8A92]' },
            ].map((r) => (
              <div key={r.label} className="mb-3">
                <div className="mb-1 flex justify-between font-body-sm text-body-sm">
                  <span className="text-[#8A8A92]">{r.label}</span>
                  <span className="font-bold tabular-nums text-[#1A1A1E]">{r.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECECEC]">
                  <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.value / r.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {modalAction && selected && (
        <>
          <div className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-[2px]" onClick={closeModal} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
            <div className="rounded-xl border-2 border-[#ECECEC] bg-white shadow-2xl overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${modalAction === 'desactiver' ? 'bg-[#E8433D]' : 'bg-[#E8433D]'}`} />
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${modalAction === 'desactiver' ? 'bg-[#E8433D]/10 border-2 border-[#E8433D]/30' : 'bg-[#E8433D]/10 border-2 border-[#E8433D]/30'}`}>
                    <span className={`material-symbols-outlined text-[24px] text-[#E8433D]`}>
                      {modalAction === 'desactiver' ? 'block' : 'delete'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight text-[#1A1A1E]">
                      {modalAction === 'desactiver' ? 'Désactiver le membre' : 'Supprimer le membre'}
                    </h3>
                    <p className="font-body text-sm text-[#8A8A92] mt-1">
                      {modalAction === 'desactiver'
                        ? <>Confirmer la désactivation de <strong className="text-[#1A1A1E]">{selected.nom}</strong> ?</>
                        : <>Confirmer la suppression de <strong className="text-[#1A1A1E]">{selected.nom}</strong> ? Cette action est irréversible.</>}
                    </p>
                  </div>
                </div>

                {modalAction === 'desactiver' && (
                  <textarea value={motif} onChange={(e) => setMotif(e.target.value)}
                    placeholder="Motif (optionnel)..."
                    className="w-full rounded-lg border-2 border-[#ECECEC] bg-[#F7F7F8] p-3 font-body text-sm text-[#1A1A1E] outline-none focus:border-[#E8433D] resize-none h-24" />
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-[#ECECEC] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
                    <span className="material-symbols-outlined text-[18px]">close</span> Annuler
                  </button>
                  <button onClick={modalAction === 'desactiver' ? handleDesactiver : handleSupprimer}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50 bg-[#E8433D] hover:bg-[#B82823]">
                    {actionLoading ? 'En cours...' : modalAction === 'desactiver' ? 'Confirmer désactivation' : 'Confirmer suppression'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default EquipeTab
