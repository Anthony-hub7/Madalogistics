import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sacsService } from '../../services/sacsService'
import { demandesService } from '../../services/demandesService'
import { affectationService } from '../../services/affectationService'
import { vrpService } from '../../services/vrpService'
import SacColisEditorModal from '../../components/planification/SacColisEditorModal'
import SacCreerModal from '../../components/logistique/SacCreerModal'
import AffectationEditor from '../../components/planification/AffectationEditor'
import TourneeEditor from '../../components/planification/TourneeEditor'
import SacDetailModal from '../../components/SacDetailModal'

const FILTRES = [
  { key: '', label: 'Tous en attente' },
  { key: 'CONSTITUE', label: 'À affecter' },
  { key: 'VRP', label: 'VRP à faire' },
]

/** Sacs pas encore optimisés : constitués (à affecter) + affectés sans tournée (VRP à faire). */
function estEnAttente(s) {
  return s.statut === 'CONSTITUE' || (s.statut === 'AFFECTE' && !s.hasTournee)
}

function etapeDuSac(s) {
  if (s.statut === 'CONSTITUE') return 'CONSTITUE'
  return 'VRP'
}

function Modal({ title, icon, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className={`bg-surface rounded-xl border border-outline-variant shadow-xl w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4 sticky top-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">{icon}</span>
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-on-surface">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high cursor-pointer" aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function SacsPage() {
  const navigate = useNavigate()
  const [sacs, setSacs] = useState([])
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtre, setFiltre] = useState('')
  const [hubId, setHubId] = useState('')
  const [recherche, setRecherche] = useState('')

  // Modales
  const [detailSacId, setDetailSacId] = useState(null)
  const [editSac, setEditSac] = useState(null)
  const [creerOuvert, setCreerOuvert] = useState(false)
  const [succes, setSucces] = useState(null) // { type: 'ok'|'warn', msg }
  const [affectData, setAffectData] = useState(null) // { sac, preview }
  const [vrpSac, setVrpSac] = useState(null)
  const [vrpResults, setVrpResults] = useState({})
  const [vrpTournees, setVrpTournees] = useState({})
  const [vrpPreviewLoading, setVrpPreviewLoading] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [annulSac, setAnnulSac] = useState(null) // sac freelance a annuler

  const refresh = async () => {
    try {
      const data = await sacsService.getAll()
      setSacs(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur de chargement des sacs')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [sRes, hRes] = await Promise.allSettled([
        sacsService.getAll(),
        demandesService.getHubs(),
      ])
      if (cancelled) return
      if (sRes.status === 'fulfilled') setSacs(Array.isArray(sRes.value) ? sRes.value : [])
      else setError(sRes.reason?.body?.error || sRes.reason?.message || 'Erreur de chargement')
      if (hRes.status === 'fulfilled') setHubs(Array.isArray(hRes.value) ? hRes.value : [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const enAttente = useMemo(() => sacs.filter(estEnAttente), [sacs])
  const nbAAffecter = useMemo(() => enAttente.filter(s => s.statut === 'CONSTITUE').length, [enAttente])
  const nbVrp = useMemo(() => enAttente.filter(s => s.statut === 'AFFECTE').length, [enAttente])

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return enAttente.filter((s) => {
      if (filtre === 'CONSTITUE' && s.statut !== 'CONSTITUE') return false
      if (filtre === 'VRP' && !(s.statut === 'AFFECTE' && !s.hasTournee)) return false
      if (hubId && s.hubId !== hubId) return false
      if (!q) return true
      return (s.chauffeurNom || '').toLowerCase().includes(q)
        || (s.hubNom || '').toLowerCase().includes(q)
        || (s.immatriculation || '').toLowerCase().includes(q)
        || String(s.sacId).toLowerCase().includes(q)
    })
  }, [enAttente, filtre, hubId, recherche])

  // ── Suppression (CONSTITUE/AFFECTE) ──
  const handleSupprimer = async (sac) => {
    const ok = window.confirm(
      `Supprimer ce sac (${sac.nbColis} colis) ?\n\n` +
      'Les colis repasseront en attente de groupage' +
      (sac.chauffeurNom ? ' et le chauffeur/véhicule affecté seront libérés' : '') + '.'
    )
    if (!ok) return
    setActionLoading(true)
    setError(null)
    try {
      await sacsService.remove(sac.sacId)
      await refresh()
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur suppression du sac')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Annulation d'une mission freelance (mode cible au choix) ──
  const handleAnnulerFreelance = async (mode) => {
    const sac = annulSac
    if (!sac) return
    const attendu = mode === 'AGENCE' ? 'AGENCE' : 'FREELANCE'
    const confirme = window.confirm(
      attendu === 'AGENCE'
        ? `Remettre cette commande en groupage (mode AGENCE) ?\n\n` +
          'Les colis sortiront du sac, le sac sera supprime et la commande ' +
          'repassera en attente de groupage.'
        : `Republier cette mission aux freelances ?\n\n` +
          'La tournee et le chauffeur/véhicule seront liberes, le sac reste propose.'
    )
    if (!confirme) return

    setActionLoading(true)
    setError(null)
    setSucces(null)
    try {
      const res = await sacsService.annulerFreelance(sac.sacId, { mode: attendu })
      setAnnulSac(null)
      await refresh()
      setSucces({ type: 'ok', msg: res?.message || 'Mission freelance annulee.' })
    } catch (e) {
      setError(e.body?.error || e.message || "Erreur lors de l'annulation de la mission")
    } finally {
      setActionLoading(false)
    }
  }

  // ── Édition colis (modale) ──
  const handleEditSaved = async () => {
    setEditSac(null)
    await refresh()
  }

  // ── Création manuelle (modale) ──
  const handleCreerSaved = async (res) => {
    setCreerOuvert(false)
    await refresh()
    if (res?.tauxRemplissage > 100) {
      setSucces({
        type: 'warn',
        msg: `Sac créé — ${res.nbColis} colis · ${res.poidsKg} kg, mais remplissage ${Math.round(res.tauxRemplissage)} % : dépasse la capacité habituelle du hub.`,
      })
    } else {
      setSucces({
        type: 'ok',
        msg: `Sac créé — ${res?.nbColis ?? 0} colis · ${res?.poidsKg ?? 0} kg · ${Math.round(res?.tauxRemplissage || 0)} % de remplissage.`,
      })
    }
  }

  // ── Affectation manuelle (modale) ──
  const handleAffecter = async (sac) => {
    if (!sac.hubId) {
      setError('Hub du sac introuvable — affectation impossible')
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      const preview = await affectationService.preview(sac.hubId)
      setAffectData({ sac, preview })
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur chargement affectation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAffectationValider = async (decisions) => {
    if (!affectData) return
    const valides = decisions.filter(d => d.chauffeurId && d.vehiculeId)
    if (valides.length === 0) {
      setError('Sélectionnez au moins un chauffeur et un véhicule')
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      await affectationService.valider(affectData.preview.hubId, valides)
      setAffectData(null)
      await refresh()
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation affectation')
    } finally {
      setActionLoading(false)
    }
  }

  // ── VRP (modale) ──
  const handleVrpPreview = async (sacId) => {
    setVrpPreviewLoading(sacId)
    setError(null)
    try {
      const result = await vrpService.preview(sacId)
      setVrpResults(prev => ({ ...prev, [sacId]: result }))
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur VRP preview')
    } finally {
      setVrpPreviewLoading(null)
    }
  }

  const handleVrpValider = async (sacId, etapes) => {
    setActionLoading(true)
    setError(null)
    try {
      const result = await vrpService.valider(sacId, etapes)
      if (result?.tourneeId) {
        setVrpTournees(prev => ({ ...prev, [sacId]: result.tourneeId }))
      }
      await refresh()
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation VRP')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline-variant/60 pb-5">
        <div className="flex items-center gap-3">
          <span className="font-stamp text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">LOGISTIQUE</span>
        </div>
        <h2 className="font-display text-3xl font-bold text-on-surface uppercase tracking-tight mt-1">Sacs en attente</h2>
        <p className="font-body text-sm text-on-surface-variant">
          Sacs pas encore optimisés : constitués à affecter et affectés en attente de tournée. Gérez tout manuellement ici.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div className="flex-1"><p className="text-sm text-red-800">{error}</p></div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {succes && (
        <div className={`border rounded-xl p-4 flex items-start gap-3 ${
          succes.type === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
        }`}>
          <span className={`material-symbols-outlined mt-0.5 ${
            succes.type === 'warn' ? 'text-amber-600' : 'text-green-600'
          }`}>{succes.type === 'warn' ? 'warning' : 'check_circle'}</span>
          <div className="flex-1">
            <p className={`text-sm ${succes.type === 'warn' ? 'text-amber-800' : 'text-green-800'}`}>{succes.msg}</p>
          </div>
          <button onClick={() => setSucces(null)} className={succes.type === 'warn' ? 'text-amber-400 hover:text-amber-600' : 'text-green-400 hover:text-green-600'}>
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="waybill-card p-5 border-l-4 border-l-primary">
          <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant font-semibold">En attente</p>
          <p className="font-display text-2xl font-bold mt-1 text-on-surface tabular-nums">{loading ? '…' : enAttente.length}</p>
        </div>
        <div className="waybill-card p-5 border-l-4 border-l-blue-500">
          <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant font-semibold">À affecter</p>
          <p className="font-display text-2xl font-bold mt-1 text-on-surface tabular-nums">{loading ? '…' : nbAAffecter}</p>
        </div>
        <div className="waybill-card p-5 border-l-4 border-l-purple-500">
          <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant font-semibold">VRP à faire</p>
          <p className="font-display text-2xl font-bold mt-1 text-on-surface tabular-nums">{loading ? '…' : nbVrp}</p>
        </div>
      </div>

      <div className="waybill-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTRES.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              className={`px-3 py-1.5 rounded-full border font-display text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors ${
                filtre === f.key
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={hubId}
          onChange={(e) => setHubId(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface"
        >
          <option value="">Tous les hubs</option>
          {hubs.map((h) => (
            <option key={h.hubId || h.id} value={h.hubId || h.id}>{h.nom}</option>
          ))}
        </select>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2">
            <span className="material-symbols-outlined text-outline text-lg">search</span>
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chauffeur, hub, plaque, n° sac…"
              className="w-full bg-transparent font-body text-sm text-on-surface outline-none placeholder:text-outline"
            />
          </div>
        </div>
        <button
          onClick={() => { setSucces(null); setCreerOuvert(true) }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-on-primary hover:opacity-90 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Créer un sac
        </button>
      </div>

      <div className="waybill-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
              Sacs à traiter <span className="text-on-surface-variant font-normal">({filtrees.length})</span>
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Sac</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Hub</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Contenu</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Remplissage</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Étape</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Chargement…</td></tr>
              ) : filtrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline">inventory_2</span>
                    <p className="font-body text-sm text-on-surface-variant mt-2">Aucun sac en attente. Lancez un groupage depuis la page Optimisation.</p>
                    <button
                      onClick={() => navigate('/logistics/optimisation')}
                      className="mt-3 px-4 py-2 rounded-lg bg-primary text-on-primary font-display text-xs uppercase font-bold tracking-wider hover:opacity-90 cursor-pointer"
                    >
                      Aller à l'optimisation
                    </button>
                  </td>
                </tr>
              ) : (
                filtrees.map((s) => {
                  const etape = etapeDuSac(s)
                  const estFreelance = !!s.freelance
                  const aAffecter = etape === 'CONSTITUE'
                  return (
                    <tr key={s.sacId} className="transition-colors hover:bg-surface-light/70">
                      <td className="px-6 py-4">
                        <button onClick={() => setDetailSacId(s.sacId)}
                                className="font-mono font-bold text-sm text-primary hover:underline cursor-pointer">
                          {String(s.sacId).slice(0, 8)}
                        </button>
                        <p className="font-mono text-[10px] text-on-surface-variant">{s.categorieDominante || 'STANDARD'}</p>
                      </td>
                      <td className="px-6 py-4 font-body text-sm text-on-surface">{s.hubNom || '—'}</td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">
                        {s.nbColis} colis · {s.poidsKg} kg
                        <p className="font-mono text-[10px]">{s.chauffeurNom || 'Sans chauffeur'} · {s.immatriculation || 'Sans véhicule'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-outline-variant/50 overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round(s.tauxRemplissage || 0))}%` }} />
                          </div>
                          <span className="font-mono text-xs text-on-surface-variant">{Math.round(s.tauxRemplissage || 0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {estFreelance ? (
                          s.statut === 'CONSTITUE' ? (
                            <span className="inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase bg-amber-100 text-amber-700">Appel d'offres</span>
                          ) : (
                            <span className="inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase bg-red-100 text-red-700">Mission freelance</span>
                          )
                        ) : aAffecter ? (
                          <span className="inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase bg-blue-100 text-blue-700">À affecter</span>
                        ) : (
                          <span className="inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase bg-purple-100 text-purple-700">VRP à faire</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setDetailSacId(s.sacId)} title="Voir le détail"
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button onClick={() => setEditSac(s)} title="Éditer les colis du sac"
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">edit_note</span>
                          </button>
                          {aAffecter && !estFreelance && (
                            <button onClick={() => handleAffecter(s)} title="Affecter chauffeur + véhicule"
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-[18px]">person_add</span>
                            </button>
                          )}
                          {!aAffecter && (
                            <button onClick={() => setVrpSac(s)} title="Planifier la tournée (VRP)"
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-[18px]">route</span>
                            </button>
                          )}
                          {estFreelance ? (
                            <button onClick={() => setAnnulSac(s)}
                                    title="Annuler la mission (republier ou remettre en groupage)"
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-[18px]">campaign</span>
                            </button>
                          ) : (
                            <button onClick={() => handleSupprimer(s)} title="Supprimer le sac (colis libérés)"
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {actionLoading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-surface border border-outline-variant shadow-xl px-4 py-3">
          <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
          <span className="font-body text-sm text-on-surface">Traitement en cours…</span>
        </div>
      )}

      {detailSacId && <SacDetailModal sacId={detailSacId} onClose={() => setDetailSacId(null)} />}

      {editSac && (
        <SacColisEditorModal
          sac={editSac}
          hubId={editSac.hubId}
          onClose={() => setEditSac(null)}
          onSaved={handleEditSaved}
        />
      )}

      {creerOuvert && (
        <SacCreerModal
          hubs={hubs}
          hubInitial={hubId}
          onClose={() => setCreerOuvert(false)}
          onSaved={handleCreerSaved}
        />
      )}

      {affectData && (
        <Modal title="Affectation chauffeur + véhicule" icon="person_add" wide
               onClose={() => setAffectData(null)}>
          <p className="font-body text-sm text-on-surface-variant mb-4">
            Sac {String(affectData.sac.sacId).slice(0, 8)} — sélectionnez les paires, vérifiez la compatibilité, validez.
          </p>
          <AffectationEditor
            preview={affectData.preview}
            onValider={handleAffectationValider}
            onReculer={() => setAffectData(null)}
            loading={actionLoading}
          />
        </Modal>
      )}

      {annulSac && (
        <Modal title="Annuler la mission freelance" icon="campaign"
               onClose={() => setAnnulSac(null)}>
          <p className="font-body text-sm text-on-surface-variant mb-4">
            Sac {String(annulSac.sacId).slice(0, 8)} — {annulSac.nbColis} colis · {annulSac.poidsKg} kg.
            Choisissez le mode cible de cette annulation.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => handleAnnulerFreelance('FREELANCE')}
              disabled={actionLoading}
              className="w-full flex items-start gap-3 rounded-lg border-2 border-[#E8433D] bg-[#E8433D]/5 p-4 text-left hover:bg-[#E8433D]/10 transition-colors disabled:opacity-50 cursor-pointer">
              <span className="material-symbols-outlined text-[#E8433D]">campaign</span>
              <span>
                <span className="block font-display text-xs font-bold uppercase tracking-wider text-[#E8433D]">
                  Rester en freelance (republier)
                </span>
                <span className="block font-body text-xs text-on-surface-variant mt-0.5">
                  La tournée et le chauffeur/véhicule sont libérés, le sac reste proposé aux freelances.
                </span>
              </span>
            </button>
            <button
              onClick={() => handleAnnulerFreelance('AGENCE')}
              disabled={actionLoading}
              className="w-full flex items-start gap-3 rounded-lg border-2 border-outline-variant bg-surface p-4 text-left hover:border-primary/50 transition-colors disabled:opacity-50 cursor-pointer">
              <span className="material-symbols-outlined text-primary">group_work</span>
              <span>
                <span className="block font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                  Remettre en groupage (agence)
                </span>
                <span className="block font-body text-xs text-on-surface-variant mt-0.5">
                  Les colis sortent du sac, le sac est supprimé et la commande repasse en attente de groupage.
                </span>
              </span>
            </button>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => setAnnulSac(null)} disabled={actionLoading}
                    className="px-4 py-2 border border-outline-variant rounded font-body text-xs text-on-surface-variant hover:text-on-surface cursor-pointer">
              Fermer
            </button>
          </div>
        </Modal>
      )}

      {vrpSac && (
        <Modal title="Planifier la tournée (VRP)" icon="route" wide
               onClose={() => setVrpSac(null)}>
          <p className="font-body text-sm text-on-surface-variant mb-4">
            Sac {String(vrpSac.sacId).slice(0, 8)} — {vrpSac.chauffeurNom || '—'} / {vrpSac.immatriculation || '—'}.
            Prévisualisez l'ordre des étapes puis validez.
          </p>
          <TourneeEditor
            sacsAffectes={[{ ...vrpSac, sacId: vrpSac.sacId }]}
            vrpResults={vrpResults}
            tourneeIds={vrpTournees}
            onVrpPreview={handleVrpPreview}
            onVrpValider={handleVrpValider}
            onReculer={() => setVrpSac(null)}
            onEditColis={setEditSac}
            onDeleteSac={handleSupprimer}
            loading={actionLoading}
            previewLoadingSac={vrpPreviewLoading}
          />
          {vrpTournees[vrpSac.sacId] && (
            <button
              onClick={() => navigate(`/logistics/tournees?tourneeId=${vrpTournees[vrpSac.sacId]}`)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              Voir la tournée créée
            </button>
          )}
        </Modal>
      )}
    </div>
  )
}
