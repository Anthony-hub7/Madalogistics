import { useState } from 'react'

const MODES = [
  { value: 'AGENCE', label: 'Chauffeur de l\'agence', desc: 'Affectation via matrice compatibilité interne' },
  { value: 'FREELANCE', label: 'Chauffeur freelance', desc: 'Scoring dynamique, missions multi-agences' },
]

export default function ValiderCommandeModal({ open, nbColis, onClose, onConfirm, acting }) {
  const [mode, setMode] = useState('AGENCE')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1E]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#1A1A1E] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
        <h3 className="font-display text-lg font-bold text-[#1A1A1E] uppercase">Valider la commande</h3>
        <p className="font-body text-xs text-[#8A8A92]">
          Cette action est <strong>irréversible</strong>. La commande passera en attente de groupage.
        </p>
        {nbColis != null && (
          <p className="font-mono text-xs text-[#1A1A1E]">
            <span className="text-[#8A8A92]">Colis :</span> <strong>{nbColis}</strong>
          </p>
        )}
        <div className="space-y-2">
          {MODES.map(m => (
            <label key={m.value}
              className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                mode === m.value ? 'border-[#E8433D] bg-[#E8433D]/5' : 'border-[#ECECEC] hover:border-[#8A8A92]'
              }`}>
              <input type="radio" name="modeLivraison" value={m.value}
                checked={mode === m.value} onChange={() => setMode(m.value)}
                className="mt-0.5 accent-[#E8433D]" />
              <div>
                <span className="font-mono text-xs font-bold text-[#1A1A1E]">{m.label}</span>
                <p className="font-body text-[10px] text-[#8A8A92] mt-0.5">{m.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 border border-[#ECECEC] rounded font-body text-xs text-[#8A8A92] hover:text-[#1A1A1E]">
            Annuler
          </button>
          <button onClick={() => onConfirm(mode)} disabled={acting}
            className="px-4 py-2 bg-green-600 text-white rounded font-body font-semibold text-xs hover:bg-green-700 disabled:opacity-40">
            {acting ? '…' : 'Confirmer la validation'}
          </button>
        </div>
      </div>
    </div>
  )
}
