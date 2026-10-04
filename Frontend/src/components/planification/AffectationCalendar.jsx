import { useState, useEffect } from 'react'
import { indisponibilitesService } from '../../services/indisponibilitesService'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export default function AffectationCalendar({ chauffeurId, chauffeurNom, onClose }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [indispos, setIndispos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState('')
  const [formMotif, setFormMotif] = useState('')
  const [saving, setSaving] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadIndispos = async () => {
    if (!chauffeurId) return
    setLoading(true)
    try {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const data = await indisponibilitesService.listerChauffeurs(chauffeurId, from, to)
      setIndispos(data || [])
    } catch {
      setIndispos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadIndispos() }, [chauffeurId, year, month])

  const firstDay = new Date(year, month, 1).getDay()
  const startIdx = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const isIndispo = (day) => {
    const date = new Date(year, month, day)
    return indispos.some(ind => {
      const debut = new Date(ind.debut)
      const fin = new Date(ind.fin)
      return date >= debut && date <= fin
    })
  }

  const getIndispoMotif = (day) => {
    const date = new Date(year, month, day)
    const ind = indispos.find(i => {
      const debut = new Date(i.debut)
      const fin = new Date(i.fin)
      return date >= debut && date <= fin
    })
    return ind?.motif || ''
  }

  const handleAddIndispo = async () => {
    if (!formDate) return
    setSaving(true)
    try {
      await indisponibilitesService.creerChauffeur({
        chauffeurId,
        debut: `${formDate}T00:00:00`,
        fin: `${formDate}T23:59:59`,
        motif: formMotif || 'Indisponible',
      })
      setFormDate('')
      setFormMotif('')
      setShowForm(false)
      await loadIndispos()
    } catch (e) {
      alert(e?.body?.error || e?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveIndispo = async (indispoId) => {
    try {
      await indisponibilitesService.supprimerChauffeur(indispoId, chauffeurId)
      await loadIndispos()
    } catch (e) {
      alert(e?.body?.error || e?.message || 'Erreur')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Calendrier — {chauffeurNom}</h3>
            <p className="text-xs text-blue-100">Cocher les jours d'indisponibilité</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-5">
          {/* Navigation mois */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <span className="font-bold text-gray-900">{MOIS[month]} {year}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {JOURS.map(j => (
              <div key={j} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{j}</div>
            ))}
          </div>

          {/* Grille jours */}
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startIdx }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const indispo = isIndispo(day)
                const motif = getIndispoMotif(day)
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

                return (
                  <div key={day} className="relative group">
                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                      indispo
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : isToday
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : isPast
                            ? 'text-gray-300'
                            : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                      {day}
                    </div>
                    {motif && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        {motif}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Légende */}
          <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded" /> Indisponible</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 rounded" /> Aujourd'hui</div>
          </div>

          {/* Liste des indisponibilités */}
          {indispos.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Indisponibilités ce mois</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {indispos.map(ind => (
                  <div key={ind.indispoId} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 text-xs">
                    <div>
                      <span className="font-medium text-red-800">
                        {new Date(ind.debut).toLocaleDateString('fr-FR')}
                      </span>
                      {ind.motif && <span className="text-red-600 ml-2">— {ind.motif}</span>}
                    </div>
                    <button onClick={() => handleRemoveIndispo(ind.indispoId)}
                      className="text-red-400 hover:text-red-600">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire ajout */}
          {showForm ? (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Motif</label>
                <input type="text" value={formMotif} onChange={e => setFormMotif(e.target.value)}
                  placeholder="Congé, maladie..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                  Annuler
                </button>
                <button onClick={handleAddIndispo} disabled={!formDate || saving}
                  className="flex-1 px-3 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Marquer indisponible'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="mt-4 w-full px-4 py-2.5 bg-red-50 text-red-700 rounded-xl font-medium text-sm hover:bg-red-100 flex items-center justify-center gap-2 border border-red-200">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Marquer un jour d'indisponibilité
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
