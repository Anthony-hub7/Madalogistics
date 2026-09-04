const members = [
  { name: 'Andry Rakoto', email: 'arakoto@madalogistics.mg', initials: 'AR', avatarBg: 'bg-[#E8433D] text-white', role: 'Responsable logistique', hub: 'Antananarivo', statut: 'Actif', statutClass: 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]', statutDot: 'bg-[#1A1A1E]', date: '12/01/2023' },
  { name: 'Sitraka Niaina', email: 'sniaina@madalogistics.mg', initials: 'SN', avatarBg: 'bg-[#1A1A1E] text-white', role: 'Chauffeur', hub: 'Toamasina', statut: 'Actif', statutClass: 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]', statutDot: 'bg-[#1A1A1E]', date: '05/03/2023' },
  { name: 'Fara Randria', email: 'frandria@madalogistics.mg', initials: 'FR', avatarBg: 'bg-[#ECECEC] text-[#8A8A92] border border-[#ECECEC]', role: 'Responsable logistique', hub: 'Antsirabe', statut: 'Inactif', statutClass: 'bg-[#F7F7F8] text-[#8A8A92] border-[#ECECEC]', statutDot: 'bg-[#8A8A92]', date: '10/11/2022' },
  { name: 'Lova Miandry', email: 'lmiandry@madalogistics.mg', initials: 'LM', avatarBg: 'bg-[#E8433D] text-white', role: 'Chauffeur', hub: 'Mahajanga', statut: 'Actif', statutClass: 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]', statutDot: 'bg-[#1A1A1E]', date: '22/04/2023' },
]

function EquipeTab() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-[#ECECEC] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#ECECEC] bg-[#F7F7F8] p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-headline-md text-headline-md text-[#1A1A1E]">Gestion de l'Équipe</h2>
            <p className="font-body-sm text-body-sm text-[#8A8A92]">
              Administrez les accès et rôles opérationnels du réseau logistique.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#8A8A92]">search</span>
              <input
                type="text"
                placeholder="Rechercher un membre..."
                className="w-64 rounded-lg border border-[#ECECEC] bg-white py-2 pl-10 pr-4 font-body-sm text-body-sm text-[#1A1A1E] outline-none transition-all focus:border-[#E8433D] focus:ring-2 focus:ring-[#E8433D]/20"
              />
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-[#E8433D] px-5 py-2 font-label-md text-label-md text-white shadow-sm transition-all hover:bg-[#B82823] active:scale-[0.98]">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              Inviter un utilisateur
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-[#ECECEC] bg-[#F7F7F8] text-[#8A8A92]">
              <tr>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Hub</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider">Date d'ajout</th>
                <th className="px-6 py-4 text-right font-label-sm text-label-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC]/70">
              {members.map((m) => (
                <tr key={m.email} className="transition-colors hover:bg-[#F7F7F8]/60">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold border-2 border-[#ECECEC] ${m.avatarBg}`}>{m.initials}</div>
                      <div>
                        <p className="font-body-md text-body-md font-bold text-[#1A1A1E]">{m.name}</p>
                        <p className="font-label-sm text-label-sm text-[#8A8A92]">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-body-sm text-body-sm text-[#8A8A92]">{m.role}</td>
                  <td className="px-6 py-4 font-body-sm text-body-sm font-semibold text-[#1A1A1E]">{m.hub}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold font-stamp tracking-wide border-2 ${m.statutClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.statutDot} ${m.statut === 'Actif' ? 'animate-pulse' : ''}`}></span>
                      {m.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-body-sm text-body-sm text-[#8A8A92]">{m.date}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="rounded-full p-2 text-[#8A8A92] transition-colors hover:bg-[#F7F7F8] hover:text-[#E8433D]">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#ECECEC] bg-[#F7F7F8] px-6 py-4">
          <p className="font-label-sm text-label-sm text-[#8A8A92]">Affichage de 1-4 sur 28 membres de l'équipe</p>
          <div className="flex gap-2">
            <button className="rounded-lg border-2 border-[#ECECEC] bg-white px-3 py-1.5 transition-colors hover:bg-[#F7F7F8] text-[#8A8A92]" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="rounded-lg border-2 border-[#E8433D] bg-[#E8433D] px-3 py-1.5 font-label-md text-label-md text-white shadow-sm">1</button>
            <button className="rounded-lg border-2 border-[#ECECEC] bg-white px-3 py-1.5 font-label-md text-label-md transition-colors hover:bg-[#F7F7F8] text-[#8A8A92] hover:text-[#1A1A1E]">2</button>
            <button className="rounded-lg border-2 border-[#ECECEC] bg-white px-3 py-1.5 font-label-md text-label-md transition-colors hover:bg-[#F7F7F8] text-[#8A8A92] hover:text-[#1A1A1E]">3</button>
            <button className="rounded-lg border-2 border-[#ECECEC] bg-white px-3 py-1.5 transition-colors hover:bg-[#F7F7F8] text-[#8A8A92]">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex h-64 flex-col justify-between overflow-hidden rounded-xl bg-[#E8433D] p-6 text-white shadow-sm lg:col-span-1 relative">
          <div className="relative z-10">
            <h3 className="mb-1 font-label-sm text-label-sm uppercase tracking-widest opacity-90">Total Effectif</h3>
            <p className="font-headline-xl text-headline-xl font-extrabold tabular-nums">28</p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between border-b border-white/20 pb-2 font-label-md text-label-md">
                <span>Managers</span>
                <span className="font-bold tabular-nums">6</span>
              </div>
              <div className="flex justify-between border-b border-white/20 pb-2 font-label-md text-label-md">
                <span>Chauffeurs</span>
                <span className="font-bold tabular-nums">18</span>
              </div>
              <div className="flex justify-between font-label-md text-label-md">
                <span>Admin</span>
                <span className="font-bold tabular-nums">4</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-10">
            <span className="material-symbols-outlined text-[160px]">group</span>
          </div>
          <button className="relative z-10 mt-6 w-full rounded-lg border-2 border-white/20 bg-white/10 py-3 font-label-md text-label-md transition-colors hover:bg-white/20 font-bold uppercase tracking-wider">
            Rapport de Gouvernance
          </button>
        </div>

        <div className="flex h-64 flex-col rounded-xl border-2 border-[#ECECEC] bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-2 font-headline-md text-headline-md text-[#1A1A1E]">Couverture des Hubs</h3>
          <div className="mb-4 flex flex-wrap gap-4">
            {[
              { l: 'Tana: 12 membres', dot: '[#E8433D]' },
              { l: 'Toamasina: 8 membres', dot: '[#1A1A1E]' },
              { l: 'Antsirabe: 5 membres', dot: '[#8A8A92]' },
              { l: 'Mahajanga: 3 membres', dot: '[#E8433D]/60' },
            ].map((h, i) => (
              <span key={i} className="flex items-center gap-2 rounded-full border border-[#ECECEC] bg-[#F7F7F8] px-3 py-1.5 font-label-md text-label-md text-[#1A1A1E]">
                <span className={`h-2 w-2 rounded-full bg-${h.dot}`} style={{ backgroundColor: i === 0 ? '#E8433D' : i === 1 ? '#1A1A1E' : i === 2 ? '#8A8A92' : 'rgba(232,67,61,0.6)' }}></span> {h.l}
              </span>
            ))}
          </div>
          <div className="flex flex-1 flex-col justify-center">
            {[
              { label: 'Responsables logistiques', value: 6, total: 28, color: 'bg-[#E8433D]' },
              { label: 'Chauffeurs', value: 18, total: 28, color: 'bg-[#1A1A1E]' },
              { label: 'Administrateurs', value: 4, total: 28, color: 'bg-[#8A8A92]' },
            ].map((r) => (
              <div key={r.label} className="mb-3">
                <div className="mb-1 flex justify-between font-body-sm text-body-sm">
                  <span className="text-[#8A8A92]">{r.label}</span>
                  <span className="font-bold tabular-nums text-[#1A1A1E]">{r.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECECEC]">
                  <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.value / r.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default EquipeTab
