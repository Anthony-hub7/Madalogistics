export default function SupportClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">
          Assistance & Régulation Corridor RN7
        </h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          Guichets d'intervention, suivi des litiges et permanence administrative.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="bordereau-row p-6 space-y-4">
          <div className="border-b border-[#ECECEC] pb-3 flex items-center justify-between">
            <span className="font-display font-bold text-sm uppercase text-[#1A1A1E]">
              Guichet Central Antananarivo
            </span>
            <span className="font-mono text-xs text-[#8A8A92]">POSTE-TANA-01</span>
          </div>
          <div className="space-y-2 font-body text-xs text-[#1A1A1E]">
            <p><strong>Emplacement :</strong> Gare Soarano, Guichet Fret Corridor RN7</p>
            <p><strong>Horaires :</strong> 06h00 – 18h00 (Lundi au Samedi)</p>
            <p><strong>Ligne Directe :</strong> <span className="font-mono font-bold text-[#E8433D]">+261 34 07 890 12</span></p>
            <p><strong>Courriel :</strong> <span className="font-mono">fret-rn7@madalogistix.mg</span></p>
          </div>
        </div>

        <div className="bordereau-row p-6 space-y-4">
          <div className="border-b border-[#ECECEC] pb-3 flex items-center justify-between">
            <span className="font-display font-bold text-sm uppercase text-[#1A1A1E]">
              Terminal Régional Antsirabe
            </span>
            <span className="font-mono text-xs text-[#8A8A92]">POSTE-ANTS-02</span>
          </div>
          <div className="space-y-2 font-body text-xs text-[#1A1A1E]">
            <p><strong>Emplacement :</strong> Zone Industrielle RN7 Sud, Antsirabe</p>
            <p><strong>Horaires :</strong> 06h00 – 17h30 (Lundi au Samedi)</p>
            <p><strong>Ligne Directe :</strong> <span className="font-mono font-bold text-[#E8433D]">+261 32 11 445 88</span></p>
            <p><strong>Courriel :</strong> <span className="font-mono">relais-antsirabe@madalogistix.mg</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#ECECEC] rounded-lg p-6 space-y-3">
        <h3 className="font-display text-base font-bold uppercase tracking-wide text-[#1A1A1E]">
          Protocole de Signalement d'Incidents
        </h3>
        <p className="font-body text-xs text-[#8A8A92] leading-relaxed">
          Pour tout retard excédant le créneau de transit garanti (24h corridor direct / 36h éco), ou en cas de réserve émise lors de la signature d'émargement (POD), veuillez mentionner obligatoirement le numéro de bordereau officiel (ex: <span className="font-mono text-[#1A1A1E] font-bold">CMD-2026-XXXX</span>).
        </p>
      </div>
    </div>
  )
}
