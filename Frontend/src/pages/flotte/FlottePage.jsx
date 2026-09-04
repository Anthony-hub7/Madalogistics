import { useState, useEffect } from 'react'
import { flotteService } from '../../services/flotteService'

const FALLBACK_VEHICLES = [
  { matricule: '4502 TBD', type: 'Camion Isuzu', icon: 'local_shipping', capaciteKg: '10,000', capaciteM3: '45', chauffeur: 'Rakoto Jean', chauffeurInitiales: 'RJ', disponibilite: 'Disponible' },
  { matricule: '8841 TAB', type: 'Mercedes Actros', icon: 'waves', capaciteKg: '25,000', capaciteM3: '80', chauffeur: 'Razafy Marc', chauffeurInitiales: 'RM', disponibilite: 'En mission' },
  { matricule: '1024 TAA', type: 'Renault Master', icon: 'airport_shuttle', capaciteKg: '3,500', capaciteM3: '12', chauffeur: null, chauffeurInitiales: null, disponibilite: 'Indisponible' },
  { matricule: '5678 ABT', type: 'Scania R480', icon: 'local_shipping', capaciteKg: '40,000', capaciteM3: '120', chauffeur: 'Tahina R.', chauffeurInitiales: 'TR', disponibilite: 'Disponible' },
  { matricule: '9012 TBC', type: 'Isuzu NPR', icon: 'local_shipping', capaciteKg: '7,500', capaciteM3: '28', chauffeur: 'Mialy A.', chauffeurInitiales: 'MA', disponibilite: 'En mission' },
  { matricule: '3344 TAE', type: 'MAN TGS', icon: 'local_shipping', capaciteKg: '18,000', capaciteM3: '60', chauffeur: null, chauffeurInitiales: null, disponibilite: 'Maintenance' },
]

const disponibiliteConfig = {
  'Disponible': { dot: 'bg-secondary', bg: 'bg-secondary-container/20 text-secondary border-secondary-container/50' },
  'En mission': { dot: 'bg-tertiary', bg: 'bg-tertiary-container/20 text-on-tertiary-container border-tertiary-container/50' },
  'Indisponible': { dot: 'bg-outline-variant', bg: 'bg-outline-variant/20 text-on-surface-variant border-outline-variant/50' },
  'Maintenance': { dot: 'bg-error', bg: 'bg-error/10 text-error border-error/50' },
}

function mapApiVehicle(v) {
  return {
    matricule: v.matricule || v.immatriculation || v.id,
    type: v.type || v.nom || 'Véhicule',
    icon: 'local_shipping',
    capaciteKg: v.capaciteKg || v.poids || '—',
    capaciteM3: v.capaciteM3 || v.volume || '—',
    chauffeur: v.chauffeur?.nom || v.chauffeurNom || null,
    chauffeurInitiales: v.chauffeur?.initiales || v.chauffeurInitiales || null,
    disponibilite: v.disponibilite || v.statut || 'Disponible',
  }
}

function AjouterVehiculeModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ matricule: '', type: '', capaciteKg: '', capaciteM3: '', chauffeur: '' })

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({
      matricule: form.matricule,
      type: form.type,
      icon: 'local_shipping',
      capaciteKg: form.capaciteKg,
      capaciteM3: form.capaciteM3,
      chauffeur: form.chauffeur || null,
      chauffeurInitiales: form.chauffeur ? form.chauffeur.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : null,
      disponibilite: 'Disponible',
    })
    setForm({ matricule: '', type: '', capaciteKg: '', capaciteM3: '', chauffeur: '' })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-outline-variant bg-surface p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Ajouter un véhicule</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Matricule</label>
              <input required value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="ex: 1234 TAA" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Type véhicule</label>
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10">
                <option value="">Sélectionner...</option>
                <option>Camion Isuzu</option>
                <option>Mercedes Actros</option>
                <option>Renault Master</option>
                <option>Scania R480</option>
                <option>Isuzu NPR</option>
                <option>MAN TGS</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Capacité poids (kg)</label>
              <input required type="number" value={form.capaciteKg} onChange={(e) => setForm({ ...form, capaciteKg: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="10 000" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">Capacité volume (m³)</label>
              <input required type="number" step="0.1" value={form.capaciteM3} onChange={(e) => setForm({ ...form, capaciteM3: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="45" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant">Chauffeur associé <span className="text-on-surface-variant opacity-60">(optionnel)</span></label>
            <input value={form.chauffeur} onChange={(e) => setForm({ ...form, chauffeur: e.target.value })} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-label-md text-label-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" placeholder="Nom du chauffeur" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high">Annuler</button>
            <button type="submit" className="rounded-lg bg-primary px-6 py-2.5 font-label-md text-label-md text-on-primary transition-all hover:opacity-90 active:scale-95">Ajouter le véhicule</button>
          </div>
        </form>
      </div>
    </>
  )
}

function FlottePage() {
  const [vehicles, setVehicles] = useState(FALLBACK_VEHICLES)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await flotteService.getAll()
        if (!cancelled && Array.isArray(data)) {
          setVehicles(data.map(mapApiVehicle))
        }
      } catch {
        // API indisponible — fallback sur données mock
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleAddVehicle = async (newVehicle) => {
    try {
      const created = await flotteService.create(newVehicle)
      if (created) {
        setVehicles(prev => [...prev, mapApiVehicle(created)])
      } else {
        setVehicles(prev => [...prev, newVehicle])
      }
    } catch {
      setVehicles(prev => [...prev, newVehicle])
    }
  }

  const filtered = vehicles.filter((v) =>
    !search || v.matricule.toLowerCase().includes(search.toLowerCase()) || v.type.toLowerCase().includes(search.toLowerCase())
  )

  const stats = [
    { label: 'Total véhicules', value: vehicles.length, filter: '', icon: 'local_shipping', hoverColor: 'hover:border-primary' },
    { label: 'Disponibles', value: vehicles.filter(v => v.disponibilite === 'Disponible').length, filter: 'Disponible', icon: 'task_alt', hoverColor: 'hover:border-secondary' },
    { label: 'En mission', value: vehicles.filter(v => v.disponibilite === 'En mission').length, filter: 'En mission', icon: 'departure_board', hoverColor: 'hover:border-tertiary' },
    { label: 'Maintenance', value: vehicles.filter(v => v.disponibilite === 'Maintenance').length, filter: 'Maintenance', icon: 'warning', hoverColor: 'hover:border-error' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestion de la Flotte</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Suivi et disponibilité de vos véhicules en temps réel</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          Ajouter un véhicule
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`cursor-pointer rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors ${s.hoverColor}`}>
            <div className="mb-3 flex items-start justify-between">
              <div className="rounded-lg bg-surface-container p-2.5 text-primary">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">{s.filter || 'Tous'}</span>
            </div>
            <div className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : s.value}</div>
            <div className="font-label-sm text-label-sm mt-1 text-on-surface-variant">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-4 border-b border-outline-variant bg-surface-container-low/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un véhicule..." className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3.5 py-2 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filtres
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3.5 py-2 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exporter CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low/50">
              <tr>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Matricule</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Type</th>
                <th className="hidden px-5 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant sm:table-cell">Capacité (kg)</th>
                <th className="hidden px-5 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant sm:table-cell">Capacité (m³)</th>
                <th className="hidden px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant lg:table-cell">Chauffeur</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Statut</th>
                <th className="px-5 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filtered.map((v) => {
                const config = disponibiliteConfig[v.disponibilite] || disponibiliteConfig['Disponible']
                return (
                  <tr key={v.matricule} className="transition-colors hover:bg-surface-container-low/30 group">
                    <td className="px-5 py-5">
                      <span className="font-label-md text-label-md font-bold text-primary">{v.matricule}</span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline">{v.icon}</span>
                        <span className="font-body-md text-body-md text-on-surface">{v.type}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-5 text-right font-label-md text-label-md text-on-surface sm:table-cell">{v.capaciteKg} kg</td>
                    <td className="hidden px-5 py-5 text-right font-label-md text-label-md text-on-surface sm:table-cell">{v.capaciteM3} m³</td>
                    <td className="hidden px-5 py-5 lg:table-cell">
                      {v.chauffeur ? (
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fdim text-xs font-bold text-primary ring-2 ring-outline-variant/20">
                            {v.chauffeurInitiales}
                          </div>
                          <span className="font-label-md text-label-md text-on-surface">{v.chauffeur}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-outline-variant/20 text-outline">
                            <span className="material-symbols-outlined text-[18px]">person_off</span>
                          </div>
                          <span className="font-label-md text-label-md italic text-outline-variant">Non assigné</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-label-sm text-label-sm font-bold ${config.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`}></span>
                        {v.disponibilite}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-primary/5 hover:text-primary">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-error/5 hover:text-error">
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
          <span className="font-label-sm text-label-sm text-on-surface-variant">Affichage 1-{filtered.length} sur {vehicles.length} véhicules</span>
          <div className="flex gap-2">
            <button className="rounded-lg border border-outline-variant p-2 text-on-surface-variant disabled:opacity-50" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="rounded-lg border border-primary bg-primary-container/10 px-4 py-2 font-bold text-primary">1</button>
            <button className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface-variant transition-colors hover:bg-surface-container">2</button>
            <button className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface-variant transition-colors hover:bg-surface-container">3</button>
            <button className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:bg-surface-container">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <AjouterVehiculeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddVehicle}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 md:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="font-headline-md text-headline-md text-on-surface">Activité de la Flotte (24h)</h4>
            <select className="rounded-lg border border-outline-variant bg-surface-container-low p-2 font-label-md text-label-md">
              <option>Aujourd'hui</option>
              <option>7 derniers jours</option>
            </select>
          </div>
          <div className="relative flex h-48 items-end gap-4 overflow-hidden rounded-lg bg-surface-container-low px-4">
            {[60, 45, 85, 30, 55, 70, 40].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: h === 85 ? '#E8433D' : h > 70 ? 'rgba(232,67,61,0.9)' : `rgba(232,67,61,${0.2 + h * 0.008})` }} />
            ))}
            <div className="absolute inset-0 flex items-center justify-center bg-surface/50 opacity-0 backdrop-blur-[2px] transition-opacity hover:opacity-100">
              <button className="rounded-full bg-primary px-6 py-3 font-label-md text-label-md font-bold text-on-primary">Voir Rapports Détaillés</button>
            </div>
          </div>
          <div className="mt-4 flex justify-between px-2 font-label-sm text-label-sm text-outline">
            <span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span><span>00:00</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl bg-inverse-surface p-6 text-inverse-on-surface">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-fixed">bolt</span>
              <h4 className="font-headline-md text-headline-md">MadaAI Optimizer</h4>
            </div>
            <p className="font-body-sm text-body-sm mb-6 opacity-80">Optimisez vos tournées en temps réel pour réduire la consommation de 12%.</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-white/20 bg-surface-container-low/30 p-4">
              <div className="font-label-sm text-label-sm uppercase tracking-tighter opacity-60">Recommandation</div>
              <div className="font-label-md text-label-md mt-1 font-semibold">Réaffectez 8841 TAB pour Antsirabe</div>
            </div>
            <button className="w-full rounded-lg bg-secondary-fixed py-3 font-black text-on-secondary-fixed transition-transform active:scale-95">
              Lancer l'Optimisation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlottePage
