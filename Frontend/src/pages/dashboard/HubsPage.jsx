import { useState } from 'react'
import { useHubs } from '../../hooks/useHubs'

const emptyForm = { nom: '', adresse: '', latitude: null, longitude: null, zoneSecuriseeDispo: false }

export default function HubsPage() {
  const { hubs, loading, error, creerHub, modifierHub, supprimerHub, toggleActifHub } = useHubs()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (hub) => {
    setForm({
      nom: hub.nom,
      adresse: hub.adresse || '',
      latitude: hub.latitude,
      longitude: hub.longitude,
      zoneSecuriseeDispo: hub.zoneSecuriseeDispo,
    })
    setEditingId(hub.hubId)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await modifierHub(editingId, form)
      } else {
        await creerHub(form)
      }
      setShowForm(false)
      setEditingId(null)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (hubId) => {
    await supprimerHub(hubId)
    setConfirmDelete(null)
  }

  const handleToggle = async (hubId) => {
    await toggleActifHub(hubId)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestion des Hubs</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Chargement...</p>
        </div>
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestion des Hubs</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Configurez les points de regroupement utilisés pour le groupage et le VRP.
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

      {error && (
        <div className="rounded-xl border border-error bg-error-container/20 p-4 text-error">
          {error}
        </div>
      )}

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
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Adresse</label>
              <input
                type="text"
                value={form.adresse || ''}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Ex: Zone Industrielle, Ankorondrano, Antananarivo"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude ?? ''}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })}
                  placeholder="-18.914"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude ?? ''}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })}
                  placeholder="47.541"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="zone_securisee"
                checked={form.zoneSecuriseeDispo}
                onChange={(e) => setForm({ ...form, zoneSecuriseeDispo: e.target.checked })}
                className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <label htmlFor="zone_securisee" className="font-label-md text-label-md text-on-surface-variant">
                Zone sécurisée disponible
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.nom.trim()}
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-label-md font-bold disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Sauvegarder' : 'Créer le hub'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="px-6 py-2.5 rounded-xl border border-outline-variant font-label-md text-label-md hover:bg-surface-container-low"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {hubs.map((hub) => (
          <div key={hub.hubId} className={`rounded-xl border bg-surface-container-lowest p-5 shadow-sm transition-all ${hub.actif ? 'border-outline-variant' : 'border-outline-variant opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${hub.actif ? 'bg-primary-container/20 text-primary' : 'bg-surface-container-high text-outline'}`}>
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-on-surface">{hub.nom}</h4>
                  {hub.adresse && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{hub.adresse}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${hub.actif ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-outline'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${hub.actif ? 'bg-secondary' : 'bg-outline'}`} />
                      {hub.actif ? 'Actif' : 'Inactif'}
                    </span>
                    {hub.zoneSecuriseeDispo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/30 font-label-sm text-label-sm text-on-tertiary-container">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Zone sécurisée
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(hub.hubId)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors" title={hub.actif ? 'Désactiver' : 'Activer'}>
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                    {hub.actif ? 'toggle_on' : 'toggle_off'}
                  </span>
                </button>
                <button onClick={() => handleEdit(hub)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors" title="Modifier">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">edit</span>
                </button>
                <button onClick={() => setConfirmDelete(hub.hubId)} className="p-2 rounded-lg hover:bg-error-container/30 transition-colors" title="Supprimer">
                  <span className="material-symbols-outlined text-[20px] text-error">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hubs.length === 0 && !loading && (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl opacity-30">add_location</span>
          <p className="font-body-md text-body-md mt-2">Aucun hub configuré</p>
          <p className="font-label-sm text-label-sm text-outline mt-1">Ajoutez un point de regroupement pour commencer.</p>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-xl max-w-sm w-full space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Confirmer la suppression</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Voulez-vous vraiment supprimer ce hub ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-error text-on-error py-2.5 rounded-xl font-label-md font-bold"
              >
                Supprimer
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-6 py-2.5 rounded-xl border border-outline-variant font-label-md text-label-md hover:bg-surface-container-low"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
