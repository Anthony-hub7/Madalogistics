import { useState, useEffect } from 'react'
import { seuilService } from '../../services/seuilService'
import { tarifsService } from '../../services/tarifsService'
import { categoriesService } from '../../services/categoriesService'

function JaugeSeuil({ value }) {
  const color = value < 50 ? '#DC3545' : value < 80 ? '#FFC107' : '#198754'
  const label = value < 50 ? 'Faible' : value < 80 ? 'Moyen' : 'Élevé'

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="font-headline-md text-headline-md" style={{ color }}>{value}%</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      </div>
    </div>
  )
}

const emptyGrille = { libelle: '', prixParKg: '', prixParM3: '', prixParKm: '', prixMinimum: '', categorieId: '' }

export default function ParametresTarifairesTab() {
  const [seuil, setSeuil] = useState(0)
  const [seuilLoading, setSeuilLoading] = useState(true)
  const [seuilSaving, setSeuilSaving] = useState(false)

  const [grilles, setGrilles] = useState([])
  const [grillesLoading, setGrillesLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyGrille)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    seuilService.obtenir()
      .then(data => setSeuil(data.seuil))
      .catch(() => {})
      .finally(() => setSeuilLoading(false))

    tarifsService.lister()
      .then(data => setGrilles(data))
      .catch(() => {})
      .finally(() => setGrillesLoading(false))

    categoriesService.lister()
      .then(data => setCategories(data))
      .catch(() => {})
  }, [])

  const handleSaveSeuil = async () => {
    setSeuilSaving(true)
    try {
      const data = await seuilService.mettreAJour(seuil)
      setSeuil(data.seuil)
    } catch {
    } finally {
      setSeuilSaving(false)
    }
  }

  const handleAddGrille = () => {
    setForm(emptyGrille)
    setEditingId(null)
    setShowForm(true)
  }

  const handleEditGrille = (g) => {
    setForm({
      libelle: g.libelle,
      prixParKg: g.prixParKg ?? '',
      prixParM3: g.prixParM3 ?? '',
      prixParKm: g.prixParKm ?? '',
      prixMinimum: g.prixMinimum ?? '',
      categorieId: g.categorieId ?? '',
    })
    setEditingId(g.grilleId)
    setShowForm(true)
  }

  const handleSaveGrille = async () => {
    if (!form.libelle.trim()) return
    setSaving(true)
    try {
      const payload = {
        libelle: form.libelle,
        prixParKg: form.prixParKg !== '' ? Number(form.prixParKg) : null,
        prixParM3: form.prixParM3 !== '' ? Number(form.prixParM3) : null,
        prixParKm: form.prixParKm !== '' ? Number(form.prixParKm) : null,
        prixMinimum: form.prixMinimum !== '' ? Number(form.prixMinimum) : null,
        categorieId: form.categorieId || null,
      }
      if (editingId) {
        const updated = await tarifsService.modifier(editingId, payload)
        setGrilles(prev => prev.map(g => g.grilleId === editingId ? updated : g))
      } else {
        const created = await tarifsService.creer(payload)
        setGrilles(prev => [...prev, created])
      }
      setShowForm(false)
      setEditingId(null)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGrille = async (grilleId) => {
    await tarifsService.supprimer(grilleId)
    setGrilles(prev => prev.filter(g => g.grilleId !== grilleId))
    setConfirmDelete(null)
  }

  const handleToggleGrille = async (grilleId) => {
    const updated = await tarifsService.toggleActif(grilleId)
    setGrilles(prev => prev.map(g => g.grilleId === grilleId ? updated : g))
  }

  return (
    <div className="space-y-6">
      {/* Seuil de remplissage */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <h3 className="font-headline-md text-headline-md mb-2">Seuil de remplissage minimum</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
          Pourcentage minimum de remplissage requis pour valider un chargement.
        </p>
        {seuilLoading ? (
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            Chargement...
          </div>
        ) : (
          <div className="space-y-4">
            <JaugeSeuil value={seuil} />
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={seuil}
                onChange={(e) => {
                  const v = Math.min(100, Math.max(0, Number(e.target.value)))
                  setSeuil(v)
                }}
                className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-md text-label-md text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="font-label-md text-label-md text-on-surface-variant">%</span>
              <button
                onClick={handleSaveSeuil}
                disabled={seuilSaving}
                className="rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {seuilSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grilles tarifaires */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <h3 className="font-headline-md text-headline-md">Grilles tarifaires</h3>
          <button
            onClick={handleAddGrille}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Ajouter
          </button>
        </div>

        {showForm && (
          <div className="p-5 border-b border-outline-variant bg-surface-container-low/30 space-y-3">
            <h4 className="font-label-md text-label-md font-bold">{editingId ? 'Modifier la grille' : 'Nouvelle grille'}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Libellé *</label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                  placeholder="Ex: Fragile - Haute valeur"
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md"
                />
              </div>
              <div className="md:col-span-3">
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Catégorie</label>
                <select
                  value={form.categorieId}
                  onChange={(e) => setForm({ ...form, categorieId: e.target.value })}
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md bg-surface-container-lowest"
                >
                  <option value="">— Repli global (aucune catégorie) —</option>
                  {categories.filter(c => c.actif).map(cat => (
                    <option key={cat.categorieId} value={cat.categorieId}>
                      {cat.libelle} ({cat.classeCode})
                    </option>
                  ))}
                </select>
                <p className="font-label-xs text-label-xs text-on-surface-variant mt-1">
                  Sélectionnez une catégorie ou laissez vide pour un tarif de repli global.
                </p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Prix/kg (Ar)</label>
                <input
                  type="number"
                  value={form.prixParKg}
                  onChange={(e) => setForm({ ...form, prixParKg: e.target.value })}
                  placeholder="250"
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md"
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Prix/m³ (Ar)</label>
                <input
                  type="number"
                  value={form.prixParM3}
                  onChange={(e) => setForm({ ...form, prixParM3: e.target.value })}
                  placeholder="15000"
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md"
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Prix/km (Ar/km)</label>
                <input
                  type="number"
                  value={form.prixParKm}
                  onChange={(e) => setForm({ ...form, prixParKm: e.target.value })}
                  placeholder="500"
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md"
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Prix minimum (Ar)</label>
                <input
                  type="number"
                  value={form.prixMinimum}
                  onChange={(e) => setForm({ ...form, prixMinimum: e.target.value })}
                  placeholder="10000"
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveGrille}
                disabled={saving || !form.libelle.trim()}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md font-bold disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : editingId ? 'Sauvegarder' : 'Créer'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="px-4 py-2 rounded-lg border border-outline-variant font-label-md text-label-md hover:bg-surface-container-low"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {grillesLoading ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Libellé</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Catégorie</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Prix/kg (Ar)</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Prix/m³ (Ar)</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Prix/km (Ar/km)</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Prix minimum (Ar)</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Statut</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {grilles.map((g) => (
                  <tr key={g.grilleId} className={`hover:bg-surface-container-low/50 ${!g.actif ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4 font-label-md text-label-md font-bold">{g.libelle}</td>
                    <td className="px-5 py-4">
                      {g.categorieLibelle ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold bg-tertiary-container/30 text-on-tertiary-container">
                          {g.categorieLibelle} ({g.categorieClasseCode})
                        </span>
                      ) : (
                        <span className="font-body-sm text-body-sm text-on-surface-variant italic">Repli global</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-body-sm text-body-sm">{g.prixParKg != null ? Number(g.prixParKg).toLocaleString() : '-'}</td>
                    <td className="px-5 py-4 font-body-sm text-body-sm">{g.prixParM3 != null ? Number(g.prixParM3).toLocaleString() : '-'}</td>
                    <td className="px-5 py-4 font-body-sm text-body-sm">{g.prixParKm != null ? `${Number(g.prixParKm).toLocaleString()} Ar/km` : '-'}</td>
                    <td className="px-5 py-4 font-body-sm text-body-sm">{g.prixMinimum != null ? Number(g.prixMinimum).toLocaleString() : '-'}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleGrille(g.grilleId)}
                        className={`px-2 py-1 rounded-full font-label-sm text-label-sm font-bold cursor-pointer transition-colors ${g.actif ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' : 'bg-surface-container-high text-outline hover:bg-surface-container-highest'}`}
                      >
                        {g.actif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditGrille(g)} className="text-primary font-label-sm text-label-sm font-bold hover:underline">Modifier</button>
                        <button onClick={() => setConfirmDelete(g.grilleId)} className="text-error font-label-sm text-label-sm font-bold hover:underline">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!grillesLoading && grilles.length === 0 && (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl opacity-30">receipt_long</span>
            <p className="font-body-md text-body-md mt-2">Aucune grille tarifaire configurée</p>
            <p className="font-label-sm text-label-sm text-outline mt-1">Ajoutez une grille avec une catégorie ou un repli global.</p>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-xl max-w-sm w-full space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Confirmer la suppression</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Voulez-vous vraiment supprimer cette grille tarifaire ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteGrille(confirmDelete)}
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
