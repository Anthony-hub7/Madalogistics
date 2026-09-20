import { useState, useEffect } from 'react'
import { flotteService } from '../../services/flotteService'
import { demandesService } from '../../services/demandesService'

const STATUT_CONFIG = {
  DISPONIBLE:    { label: 'Disponible',   dot: 'bg-secondary', bg: 'bg-secondary-container/20 text-secondary border-secondary-container/50' },
  EN_TOURNEE:    { label: 'En mission',   dot: 'bg-tertiary',  bg: 'bg-tertiary-container/20 text-on-tertiary-container border-tertiary-container/50' },
  MAINTENANCE:   { label: 'Maintenance',  dot: 'bg-error',     bg: 'bg-error/10 text-error border-error/50' },
  HORS_SERVICE:  { label: 'Hors service', dot: 'bg-outline-variant', bg: 'bg-outline-variant/20 text-on-surface-variant border-outline-variant/50' },
}

function AjouterVehiculeModal({ open, onClose, onAdd, hubs }) {
  const [form, setForm] = useState({
    immatriculation: '', hubId: '', capacitePoidsKg: '', capaciteVolumeM3: '',
    marqueModele: '', typeVehicule: '', annee: '', ptacTonnes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        immatriculation: form.immatriculation.trim().toUpperCase(),
        hubId: form.hubId,
        capacitePoidsKg: parseFloat(form.capacitePoidsKg),
        capaciteVolumeM3: parseFloat(form.capaciteVolumeM3),
        marqueModele: form.marqueModele || null,
        typeVehicule: form.typeVehicule || null,
        annee: form.annee ? parseInt(form.annee) : null,
        ptacTonnes: form.ptacTonnes ? parseFloat(form.ptacTonnes) : null,
      }
      await onAdd(payload)
      setForm({ immatriculation: '', hubId: '', capacitePoidsKg: '', capaciteVolumeM3: '', marqueModele: '', typeVehicule: '', annee: '', ptacTonnes: '' })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de la creation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-outline-variant bg-surface p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Ajouter un vehicule</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Immatriculation *</label>
              <input required value={form.immatriculation} onChange={(e) => setForm({ ...form, immatriculation: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="ex: 1234 TAA" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Hub *</label>
              <select required value={form.hubId} onChange={(e) => setForm({ ...form, hubId: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10">
                <option value="">Selectionner...</option>
                {hubs.map(h => <option key={h.hubId} value={h.hubId}>{h.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Capacite poids (kg) *</label>
              <input required type="number" step="0.01" value={form.capacitePoidsKg} onChange={(e) => setForm({ ...form, capacitePoidsKg: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="10000" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Capacite volume (m3) *</label>
              <input required type="number" step="0.01" value={form.capaciteVolumeM3} onChange={(e) => setForm({ ...form, capaciteVolumeM3: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="45" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Marque / Modele</label>
              <input value={form.marqueModele} onChange={(e) => setForm({ ...form, marqueModele: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="ex: Isuzu NPR" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Type vehicule</label>
              <select value={form.typeVehicule} onChange={(e) => setForm({ ...form, typeVehicule: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10">
                <option value="">Sélectionner...</option>
                <option value="FOURGON">Fourgon (≤ 3.5T)</option>
                <option value="CAMION">Camion (&gt; 3.5T)</option>
                <option value="SEMI_REMORQUE">Semi-remorque (&gt; 19T)</option>
                <option value="PICKUP">Pick-up (≤ 3.5T)</option>
                <option value="CITERNE">Camion citerne</option>
                <option value="PLATEAU">Camion plateau</option>
                <option value="MINIBUS">Minibus</option>
                <option value="BUS">Bus</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Annee</label>
              <input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="2020" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">PTAC (tonnes)</label>
              <input type="number" step="0.01" value={form.ptacTonnes} onChange={(e) => setForm({ ...form, ptacTonnes: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="10" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high">Annuler</button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-6 py-2.5 font-label-md text-label-md text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">
              {submitting ? 'Envoi...' : 'Ajouter le vehicule'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function FlottePage() {
  const [vehicles, setVehicles] = useState([])
  const [hubs, setHubs] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadVehicles = async (statut) => {
    try {
      const params = {}
      if (statut) params.statut = statut
      const data = await flotteService.getAll(params)
      setVehicles(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      if (err?.response?.status === 403) {
        setError('Acces refuse : vous n\'avez pas les droits pour consulter la flotte.')
      } else {
        setError('Impossible de charger la flotte. API indisponible.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      await loadVehicles()
      try {
        const h = await demandesService.getHubs()
        if (!cancelled) setHubs(Array.isArray(h) ? h : [])
      } catch {}
    }
    init()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    loadVehicles(filterStatut)
  }, [filterStatut])

  const handleAddVehicle = async (payload) => {
    const created = await flotteService.create(payload)
    setVehicles(prev => [...prev, created])
  }

  const handleDelete = async (vehiculeId) => {
    if (!window.confirm('Ce vehicule sera desactive (HORS_SERVICE). Continuer ?')) return
    try {
      await flotteService.remove(vehiculeId)
      setVehicles(prev => prev.map(v =>
        v.vehiculeId === vehiculeId ? { ...v, statut: 'HORS_SERVICE', hubId: null, hubNom: null } : v
      ))
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de la desactivation')
    }
  }

  const filtered = vehicles.filter((v) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (v.immatriculation && v.immatriculation.toLowerCase().includes(q))
      || (v.marqueModele && v.marqueModele.toLowerCase().includes(q))
      || (v.hubNom && v.hubNom.toLowerCase().includes(q))
  })

  const stats = [
    { label: 'Total vehicules', value: vehicles.length, icon: 'local_shipping', hoverColor: 'hover:border-primary' },
    { label: 'Disponibles', value: vehicles.filter(v => v.statut === 'DISPONIBLE').length, icon: 'task_alt', hoverColor: 'hover:border-secondary' },
    { label: 'En mission', value: vehicles.filter(v => v.statut === 'EN_TOURNEE').length, icon: 'departure_board', hoverColor: 'hover:border-tertiary' },
    { label: 'Maintenance', value: vehicles.filter(v => v.statut === 'MAINTENANCE').length, icon: 'warning', hoverColor: 'hover:border-error' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestion de la Flotte</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Suivi et disponibilite de vos vehicules en temps reel</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95">
          <span className="material-symbols-outlined">add</span>
          Ajouter un vehicule
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-5 py-4 text-sm text-error">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`cursor-pointer rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors ${s.hoverColor}`}>
            <div className="mb-3 flex items-start justify-between">
              <div className="rounded-lg bg-surface-container p-2.5 text-primary">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
            </div>
            <div className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '...' : s.value}</div>
            <div className="font-label-sm text-label-sm mt-1 text-on-surface-variant">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-4 border-b border-outline-variant bg-surface-container-low/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un vehicule..." className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-3">
            {[
              { k: '', l: 'Tous' },
              { k: 'DISPONIBLE', l: 'Disponible' },
              { k: 'EN_TOURNEE', l: 'En mission' },
              { k: 'MAINTENANCE', l: 'Maintenance' },
              { k: 'HORS_SERVICE', l: 'Hors service' },
            ].map(f => (
              <button key={f.k} onClick={() => setFilterStatut(f.k)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-label-md text-label-md font-bold transition-all
                  ${filterStatut === f.k
                    ? 'border-2 border-primary bg-primary text-on-primary'
                    : 'border border-outline-variant bg-surface text-on-surface hover:bg-surface-container'}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low/50">
              <tr>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Immatriculation</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Marque / Modele</th>
                <th className="hidden px-5 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant sm:table-cell">Capacite (kg)</th>
                <th className="hidden px-5 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant sm:table-cell">Capacite (m3)</th>
                <th className="hidden px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant lg:table-cell">Hub</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Statut</th>
                <th className="px-5 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant">Aucun vehicule trouvé</td></tr>
              ) : filtered.map((v) => {
                const cfg = STATUT_CONFIG[v.statut] || STATUT_CONFIG.DISPONIBLE
                return (
                  <tr key={v.vehiculeId} className="transition-colors hover:bg-surface-container-low/30">
                    <td className="px-5 py-5">
                      <span className="font-label-md text-label-md font-bold text-primary">{v.immatriculation}</span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline">local_shipping</span>
                        <span className="font-body-md text-body-md text-on-surface">{v.marqueModele || v.typeVehicule || '—'}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-5 text-right font-label-md text-label-md text-on-surface sm:table-cell">
                      {v.capacitePoidsKg != null ? `${Number(v.capacitePoidsKg).toLocaleString()} kg` : '—'}
                    </td>
                    <td className="hidden px-5 py-5 text-right font-label-md text-label-md text-on-surface sm:table-cell">
                      {v.capaciteVolumeM3 != null ? `${v.capaciteVolumeM3} m3` : '—'}
                    </td>
                    <td className="hidden px-5 py-5 lg:table-cell">
                      {v.hubNom ? (
                        <span className="font-label-md text-label-md text-on-surface">{v.hubNom}</span>
                      ) : (
                        <span className="font-label-md text-label-md italic text-outline-variant">Non assigne</span>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-label-sm text-label-sm font-bold ${cfg.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}></span>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(v.vehiculeId)}
                          disabled={v.statut === 'HORS_SERVICE'}
                          title="Desactiver"
                          className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-error/5 hover:text-error disabled:opacity-30 disabled:cursor-not-allowed">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low/10 px-5 py-4">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Affichage de {filtered.length} vehicule{filtered.length !== 1 ? 's' : ''} sur {vehicles.length}
          </span>
        </div>
      </div>

      <AjouterVehiculeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddVehicle}
        hubs={hubs}
      />
    </div>
  )
}

export default FlottePage
