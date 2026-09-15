import { useState, useEffect } from 'react'
import { categoriesService } from '../../services/categoriesService'

const emptyForm = {
  libelle: '',
  classeCode: '',
  justification: '',
  habiliteRequis: false,
  seuilsMl: { minPoids: 0, maxPoids: 999, minVolume: 0, maxVolume: 999 },
}

export default function CategoriesDirectionPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState(null)

  useEffect(() => {
    categoriesService.lister()
      .then(data => setCategories(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (cat) => {
    setForm({
      libelle: cat.libelle,
      classeCode: cat.classeCode,
      justification: cat.justification || '',
      habiliteRequis: cat.habiliteRequis || false,
      seuilsMl: cat.seuilsMl || emptyForm.seuilsMl,
    })
    setEditingId(cat.categorieId)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.libelle.trim() || !form.classeCode.trim()) return
    setSaving(true)
    try {
      const payload = {
        libelle: form.libelle,
        classeCode: form.classeCode,
        justification: form.justification || null,
        habiliteRequis: form.habiliteRequis,
        seuilsMl: form.seuilsMl,
      }
      if (editingId) {
        const updated = await categoriesService.modifier(editingId, payload)
        setCategories(prev => prev.map(c => c.categorieId === editingId ? updated : c))
      } else {
        const created = await categoriesService.creer(payload)
        setCategories(prev => [...prev, created])
      }
      setShowForm(false)
      setEditingId(null)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (categorieId) => {
    try {
      const updated = await categoriesService.toggleActif(categorieId)
      setCategories(prev => prev.map(c => c.categorieId === categorieId ? updated : c))
    } catch {
    } finally {
      setConfirmToggle(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestion des Catégories</h2>
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
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestion des Catégories</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Définissez les catégories de produits. Les tarifs (prix/kg, m³, km) se configurent dans <strong>Tarifs</strong>.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nouvelle catégorie
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border-2 border-primary bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md">
            {editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Libellé *</label>
              <input
                type="text"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                placeholder="Ex: Fragile"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Code de classe *</label>
              <input
                type="text"
                value={form.classeCode}
                onChange={(e) => setForm({ ...form, classeCode: e.target.value })}
                placeholder="Ex: FRAGILE"
                disabled={!!editingId}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {editingId && (
                <p className="font-label-xs text-label-xs text-on-surface-variant mt-1">Immuable après création</p>
              )}
            </div>
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Justification</label>
            <textarea
              value={form.justification}
              onChange={(e) => setForm({ ...form, justification: e.target.value })}
              placeholder="Description de la catégorie..."
              rows={2}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="habilite_requis"
              checked={form.habiliteRequis}
              onChange={(e) => setForm({ ...form, habiliteRequis: e.target.checked })}
              className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
            />
            <label htmlFor="habilite_requis" className="font-label-md text-label-md text-on-surface-variant">
              Habilitation chauffeur requise
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.libelle.trim() || !form.classeCode.trim()}
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-label-md font-bold disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Sauvegarder' : 'Créer'}
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

      {/* Tableau des catégories */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Libellé</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Classe</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Habilitation</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Statut</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {categories.map((cat) => (
                <tr key={cat.categorieId} className={`hover:bg-surface-container-low/50 ${!cat.actif ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4 font-label-md text-label-md font-bold">{cat.libelle}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold bg-tertiary-container/30 text-on-tertiary-container">
                      {cat.classeCode}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {cat.habiliteRequis ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/30 font-label-sm text-label-sm text-on-tertiary-container">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Requise
                      </span>
                    ) : (
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Non</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setConfirmToggle(cat.categorieId)}
                      className={`px-2 py-1 rounded-full font-label-sm text-label-sm font-bold cursor-pointer transition-colors ${cat.actif ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' : 'bg-surface-container-high text-outline hover:bg-surface-container-highest'}`}
                    >
                      {cat.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleEdit(cat)} className="text-primary font-label-sm text-label-sm font-bold hover:underline">Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl opacity-30">label</span>
            <p className="font-body-md text-body-md mt-2">Aucune catégorie configurée</p>
            <p className="font-label-sm text-label-sm text-outline mt-1">Créez une catégorie pour commencer.</p>
          </div>
        )}
      </div>

      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-xl max-w-sm w-full space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Confirmer le changement</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Voulez-vous vraiment {categories.find(c => c.categorieId === confirmToggle)?.actif ? 'désactiver' : 'activer'} cette catégorie ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleToggle(confirmToggle)}
                className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-label-md font-bold"
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmToggle(null)}
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
