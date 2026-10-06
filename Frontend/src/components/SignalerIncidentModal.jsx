import { useState } from 'react'
import { missionsService } from '../services/missionsService'

/**
 * Modale de signalement d'incident vehicule par le chauffeur
 * (panne, route coupee...). Alerte le responsable logistique.
 *
 * props : sacId, onClose, onSuccess(message)
 */
export default function SignalerIncidentModal({ sacId, onClose, onSuccess }) {
  const [type, setType] = useState('PANNE')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSignaler = async () => {
    setLoading(true)
    setError(null)
    try {
      await missionsService.signalerIncident(sacId, { type, message })
      onSuccess?.('Incident signalé au responsable logistique.')
      onClose()
    } catch (err) {
      setError(err.body?.message || err.message || 'Erreur lors du signalement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-amber-600">warning</span>
          <div>
            <h3 className="font-bold text-lg text-[#1A1A1E]">Signaler un incident</h3>
            <p className="text-sm text-[#8A8A92]">Panne, route coupée… le responsable logistique sera alerté.</p>
          </div>
        </div>

        <div>
          <label className="font-label-md text-sm text-[#8A8A92] uppercase font-bold">Type d&apos;incident</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#ECECEC] px-3 py-2.5 font-body text-[#1A1A1E]">
            <option value="PANNE">Panne véhicule</option>
            <option value="ROUTE_COUPEE">Route coupée</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>

        <div>
          <label className="font-label-md text-sm text-[#8A8A92] uppercase font-bold">Détails (lieu, gravité…)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Ex : panne moteur au PK 120 sur la RN7, besoin d'assistance…"
            className="mt-1 w-full rounded-lg border border-[#ECECEC] px-3 py-2.5 font-body text-[#1A1A1E]" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-[#ECECEC] font-bold text-[#1A1A1E]">
            Annuler
          </button>
          <button
            onClick={handleSignaler}
            disabled={loading}
            className="flex-[2] h-12 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40">
            {loading ? (
              <><span className="material-symbols-outlined animate-spin">sync</span> Envoi…</>
            ) : (
              <><span className="material-symbols-outlined">send</span> Signaler</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
