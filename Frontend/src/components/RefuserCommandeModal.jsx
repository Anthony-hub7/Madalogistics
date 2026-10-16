import { useState } from 'react'
import CommandeRecap from './CommandeRecap'

export default function RefuserCommandeModal({ open, order, onClose, onConfirm, acting, onViewDetail }) {
  const [motif, setMotif] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1E]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#1A1A1E] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-lg font-bold text-[#1A1A1E] uppercase">Refuser la commande</h3>

        <CommandeRecap order={order} onViewDetail={onViewDetail} />

        <textarea
          rows={3}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif du refus..."
          className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-body text-xs focus:outline-none focus:border-[#1A1A1E]"
        />
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 border border-[#ECECEC] rounded font-body text-xs text-[#8A8A92] hover:text-[#1A1A1E]">
            Annuler
          </button>
          <button onClick={() => onConfirm(motif)} disabled={acting}
            className="px-4 py-2 bg-[#E8433D] text-white rounded font-body font-semibold text-xs hover:bg-[#B82823] disabled:opacity-40">
            {acting ? '…' : 'Confirmer le refus'}
          </button>
        </div>
      </div>
    </div>
  )
}
