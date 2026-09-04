import { useState } from 'react'

const initialGrilles = [
  { id: 1, nom: 'Standard', tarifBase: 15000, tarifKm: 800, tarifKg: 250, actif: true },
  { id: 2, nom: 'Express', tarifBase: 25000, tarifKm: 1200, tarifKg: 400, actif: true },
  { id: 3, nom: 'Fragile-Valeur', tarifBase: 35000, tarifKm: 1500, tarifKg: 600, actif: true },
]

const initialHistorique = [
  { date: '20 Août 2026', action: 'Modification tarif Km Standard', auteur: 'Direction', details: '800 → 900 Ar/km' },
  { date: '15 Août 2026', action: 'Création grille Fragile-Valeur', auteur: 'Direction', details: 'Nouvelle grille ajoutée' },
  { date: '10 Août 2026', action: 'Modification seuil remplissage', auteur: 'Direction', details: '60% → 70%' },
]

export default function ParametresTarifairesTab() {
  const [grilles, setGrilles] = useState(initialGrilles)
  const [seuilRemplissage, setSeuilRemplissage] = useState(70)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})

  const handleEdit = (grille) => {
    setEditingId(grille.id)
    setEditValues({ tarifBase: grille.tarifBase, tarifKm: grille.tarifKm, tarifKg: grille.tarifKg })
  }

  const handleSave = (id) => {
    setGrilles(prev => prev.map(g => g.id === id ? { ...g, ...editValues } : g))
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <h3 className="font-headline-md text-headline-md mb-4">Seuil de remplissage minimum</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
          Pourcentage minimum de remplissage requis pour valider un chargement.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={seuilRemplissage}
            onChange={(e) => setSeuilRemplissage(Number(e.target.value))}
            className="flex-1"
          />
          <span className="font-headline-md text-headline-md text-primary w-16 text-right">{seuilRemplissage}%</span>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant">
          <h3 className="font-headline-md text-headline-md">Grilles tarifaires</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Nom</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tarif Base (Ar)</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tarif/Km (Ar)</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tarif/Kg (Ar)</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Statut</th>
                <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {grilles.map((g) => (
                <tr key={g.id} className="hover:bg-surface-container-low/50">
                  <td className="px-5 py-4 font-label-md text-label-md font-bold">{g.nom}</td>
                  {editingId === g.id ? (
                    <>
                      <td className="px-5 py-4">
                        <input type="number" value={editValues.tarifBase} onChange={(e) => setEditValues({ ...editValues, tarifBase: Number(e.target.value) })} className="w-28 rounded border border-outline-variant px-2 py-1 font-label-md text-label-md" />
                      </td>
                      <td className="px-5 py-4">
                        <input type="number" value={editValues.tarifKm} onChange={(e) => setEditValues({ ...editValues, tarifKm: Number(e.target.value) })} className="w-28 rounded border border-outline-variant px-2 py-1 font-label-md text-label-md" />
                      </td>
                      <td className="px-5 py-4">
                        <input type="number" value={editValues.tarifKg} onChange={(e) => setEditValues({ ...editValues, tarifKg: Number(e.target.value) })} className="w-28 rounded border border-outline-variant px-2 py-1 font-label-md text-label-md" />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-4 font-body-sm text-body-sm">{g.tarifBase.toLocaleString()}</td>
                      <td className="px-5 py-4 font-body-sm text-body-sm">{g.tarifKm.toLocaleString()}</td>
                      <td className="px-5 py-4 font-body-sm text-body-sm">{g.tarifKg.toLocaleString()}</td>
                    </>
                  )}
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full font-label-sm text-label-sm font-bold ${g.actif ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-outline'}`}>
                      {g.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {editingId === g.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(g.id)} className="text-secondary font-label-sm text-label-sm font-bold">Sauver</button>
                        <button onClick={() => setEditingId(null)} className="text-outline font-label-sm text-label-sm">Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(g)} className="text-primary font-label-sm text-label-sm font-bold hover:underline">Modifier</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant">
          <h3 className="font-headline-md text-headline-md">Historique des modifications</h3>
        </div>
        <div className="divide-y divide-outline-variant">
          {initialHistorique.map((h, i) => (
            <div key={i} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-label-md text-label-md font-bold">{h.action}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{h.details}</p>
              </div>
              <div className="text-right">
                <p className="font-label-sm text-label-sm text-on-surface-variant">{h.date}</p>
                <p className="font-label-sm text-label-sm text-outline">par {h.auteur}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
