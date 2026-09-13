import { useAuth } from '../../hooks/useAuth'

export default function ParametresClientPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">
          Paramètres du Compte & Expéditeur
        </h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          Informations d'identification fiscale, adresses habituelles de chargement et préférences d'archivage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="bordereau-row p-6 space-y-4">
          <div className="border-b border-[#ECECEC] pb-3 flex items-center justify-between">
            <span className="font-display font-bold text-sm uppercase text-[#1A1A1E]">
              Fiche Expéditeur Enregistrée
            </span>
            <span className="font-mono text-xs text-[#8A8A92]">TITULAIRE</span>
          </div>

          <div className="space-y-3 font-body text-xs text-[#1A1A1E]">
            <div>
              <span className="text-[#8A8A92] block text-[11px] uppercase font-bold">Raison Sociale / Nom</span>
              <p className="font-display text-sm font-bold mt-0.5">{user?.name || 'ANTHONY — CLIENT_FINAL'}</p>
            </div>
            <div>
              <span className="text-[#8A8A92] block text-[11px] uppercase font-bold">Adresse Électronique</span>
              <p className="font-mono mt-0.5">{user?.email || 'client@madalogistix.mg'}</p>
            </div>
            <div>
              <span className="text-[#8A8A92] block text-[11px] uppercase font-bold">Identifiant Registre (UUID)</span>
              <p className="font-mono text-[11px] text-[#8A8A92] mt-0.5">{user?.utilisateurId || 'REF-REG-2026-RN7'}</p>
            </div>
          </div>
        </div>

        <div className="bordereau-row p-6 space-y-4">
          <div className="border-b border-[#ECECEC] pb-3 flex items-center justify-between">
            <span className="font-display font-bold text-sm uppercase text-[#1A1A1E]">
              Préférences d'Avisage & Émargement
            </span>
            <span className="font-mono text-xs text-[#8A8A92]">BORDEREAUX</span>
          </div>

          <div className="space-y-3 font-body text-xs text-[#1A1A1E]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#E8433D] focus:ring-[#E8433D]" />
              <span>Recevoir l'avisage instantané lors de l'optimisation VRP (créneau précis)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#E8433D] focus:ring-[#E8433D]" />
              <span>Copie automatique de la feuille d'émargement (POD & signature) par courriel</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#E8433D] focus:ring-[#E8433D]" />
              <span>Génération automatique du relevé mensuel de fret RN7</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
