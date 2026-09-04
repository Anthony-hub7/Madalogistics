import { useState, useEffect } from 'react'

const STORAGE_KEY = 'madalogistix_hubs'

const defaultHubs = [
  { id: 1, nom: 'Hub Antananarivo', adresse: 'Zone Industrielle, Ankorondrano, Antananarivo', statut: 'actif' },
]

function loadHubs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : defaultHubs
  } catch {
    return defaultHubs
  }
}

function saveHubs(hubs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hubs))
}

export default function HubsPage() {
  const [hubs, setHubs] = useState(loadHubs)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ nom: '', adresse: '' })

  useEffect(() => {
    saveHubs(hubs)
  }, [hubs])

  const handleAdd = () => {
    setForm({ nom: '', adresse: '' })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (hub) => {
    setForm({ nom: hub.nom, adresse: hub.adresse })
    setEditingId(hub.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.nom.trim() || !form.adresse.trim()) return
    if (editingId) {
      setHubs(prev => prev.map(h => h.id === editingId ? { ...h, nom: form.nom, adresse: form.adresse } : h))
    } else {
      setHubs(prev => [...prev, { id: Date.now(), nom: form.nom, adresse: form.adresse, statut: 'actif' }])
    }
    setShowForm(false)
    setEditingId(null)
  }

  const handleDelete = (id) => {
    setHubs(prev => prev.filter(h => h.id !== id))
  }

  const handleToggle = (id) => {
    setHubs(prev => prev.map(h => h.id === id ? { ...h, statut: h.statut === 'actif' ? 'inactif' : 'actif' } : h))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestion des Hubs</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Configurez les points de départ utilisés par le VRP pour planifier les tournées.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Ajouter un hub
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border-2 border-primary bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md">
            {editingId ? 'Modifier le hub' : 'Nouveau hub'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Nom du hub</label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex: Hub Antananarivo"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Adresse / Point de départ</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Ex: Zone Industrielle, Ankorondrano, Antananarivo"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                Cette adresse sera utilisée comme point de départ des tournées VRP.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-label-md font-bold">
              {editingId ? 'Sauvegarder' : 'Créer le hub'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="px-6 py-2.5 rounded-xl border border-outline-variant font-label-md text-label-md hover:bg-surface-container-low">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {hubs.map((hub) => (
          <div key={hub.id} className={`rounded-xl border bg-surface-container-lowest p-5 shadow-sm transition-all ${hub.statut === 'actif' ? 'border-outline-variant' : 'border-outline-variant opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${hub.statut === 'actif' ? 'bg-primary-container/20 text-primary' : 'bg-surface-container-high text-outline'}`}>
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-on-surface">{hub.nom}</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{hub.adresse}</p>
                  <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${hub.statut === 'actif' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-outline'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${hub.statut === 'actif' ? 'bg-secondary' : 'bg-outline'}`} />
                    {hub.statut === 'actif' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(hub.id)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors" title={hub.statut === 'actif' ? 'Désactiver' : 'Activer'}>
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                    {hub.statut === 'actif' ? 'toggle_on' : 'toggle_off'}
                  </span>
                </button>
                <button onClick={() => handleEdit(hub)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors" title="Modifier">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">edit</span>
                </button>
                <button onClick={() => handleDelete(hub.id)} className="p-2 rounded-lg hover:bg-error-container/30 transition-colors" title="Supprimer">
                  <span className="material-symbols-outlined text-[20px] text-error">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hubs.length === 0 && (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl opacity-30">add_location</span>
          <p className="font-body-md text-body-md mt-2">Aucun hub configuré</p>
          <p className="font-label-sm text-label-sm text-outline mt-1">Ajoutez un point de départ pour le VRP.</p>
        </div>
      )}
    </div>
  )
}
