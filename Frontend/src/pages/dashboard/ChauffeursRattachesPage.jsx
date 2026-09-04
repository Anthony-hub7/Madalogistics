import { useState } from 'react'

const CHAUFFEURS_RATTACHES = [
  { id: 'CHF-0012', nom: 'Rakoto Andrianaivo', prenom: 'Jean', initiales: 'JR', cin: '101 05 000 123 45', telephone: '+261 34 12 345 67', permis: 'C+E · Valide', plaque: '1234 TAA', vehicule: 'Mercedes Actros', typeVehicule: 'Semi-remorque', capacite: '28 m³', statut: 'Actif', since: '12 Mars 2024', missions: 248, kmTotal: '186 420 km', note: '4.8/5', photoVehicule: false },
  { id: 'CHF-0018', nom: 'Razafindrakoto', prenom: 'Sitraka', initiales: 'SR', cin: '102 07 000 234 56', telephone: '+261 33 45 678 90', permis: 'C · Valide', plaque: '5678 TAB', vehicule: 'Isuzu NPR', typeVehicule: 'Camion porteur', capacite: '12 m³', statut: 'Actif', since: '04 Juin 2024', missions: 132, kmTotal: '98 740 km', note: '4.6/5', photoVehicule: false },
  { id: 'CHF-0022', nom: 'Raharimalala', prenom: 'Hery', initiales: 'HR', cin: '101 12 000 345 67', telephone: '+261 32 78 901 23', permis: 'C+E · Expire', plaque: '9012 TAA', vehicule: 'Scania R450', typeVehicule: 'Semi-remorque', capacite: '32 m³', statut: 'Actif', since: '20 Août 2023', missions: 312, kmTotal: '245 810 km', note: '4.9/5', photoVehicule: false },
  { id: 'CHF-0031', nom: 'Andrianantoandro', prenom: 'Lova', initiales: 'LA', cin: '102 02 000 456 78', telephone: '+261 34 90 123 45', permis: 'C · Valide', plaque: '3456 TSZ', vehicule: 'MAN TGS', typeVehicule: 'Camion porteur', capacite: '18 m³', statut: 'En pause', since: '08 Janvier 2025', missions: 47, kmTotal: '34 200 km', note: '4.3/5', photoVehicule: false },
  { id: 'CHF-0007', nom: 'Ranaivo', prenom: 'Tolotra', initiales: 'TR', cin: '101 09 000 567 89', telephone: '+261 33 23 456 78', permis: 'C · Susp.', plaque: '7890 TAA', vehicule: 'Renault Midlum', typeVehicule: 'Camion léger', capacite: '8 m³', statut: 'Désactivé', since: '15 Février 2024', missions: 189, kmTotal: '142 300 km', note: '4.0/5', photoVehicule: false },
]

const STATUT_STYLE = {
  'Actif':      { badge: 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]', dot: 'bg-[#1A1A1E]', stamp: 'stamp-badge-neutral' },
  'En pause':   { badge: 'bg-[#F7F7F8] text-[#E8433D] border-[#E8433D]/60',     dot: 'bg-[#E8433D]', stamp: 'stamp-badge-red' },
  'Désactivé':  { badge: 'bg-[#F7F7F8] text-[#8A8A92] border-[#ECECEC]',        dot: 'bg-[#8A8A92]', stamp: 'stamp-badge-neutral' },
}

export default function ChauffeursRattachesPage({ onNavigate }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const [showConfirm, setShowConfirm] = useState(null)

  const list = CHAUFFEURS_RATTACHES.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.nom.toLowerCase().includes(q) || c.prenom.toLowerCase().includes(q) || c.plaque.toLowerCase().includes(q)
    const matchFilter = filter === 'tous' ||
      (filter === 'actif' && c.statut === 'Actif') ||
      (filter === 'pause' && c.statut === 'En pause') ||
      (filter === 'inactif' && c.statut === 'Désactivé')
    return matchSearch && matchFilter
  })

  const nbActifs = CHAUFFEURS_RATTACHES.filter(c => c.statut === 'Actif').length
  const nbPauses = CHAUFFEURS_RATTACHES.filter(c => c.statut === 'En pause').length
  const nbInactifs = CHAUFFEURS_RATTACHES.filter(c => c.statut === 'Désactivé').length

  const toggleDesactiver = (c) => {
    if (c.statut === 'Désactivé') {
      alert(`Chauffeur ${c.prenom} ${c.nom} réactivé.`)
    } else {
      setShowConfirm(c)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-[#ECECEC] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-stamp text-[11px] uppercase px-2.5 py-1 rounded bg-[#E8433D]/10 text-[#E8433D] border border-[#E8433D]/30 font-bold">
              RATTACHEMENT AGENCE
            </span>
            <span className="font-mono text-[11px] text-[#8A8A92] font-bold tracking-widest uppercase">
              TRANS MADA SARL · RN7 TANA
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#1A1A1E] uppercase tracking-tight mt-1.5">
            Chauffeurs rattachés
          </h2>
          <p className="font-body text-sm text-[#8A8A92] mt-1">
            Gérez les chauffeurs exclusivement rattachés à votre agence. Les freelances ne figurent pas ici.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[#F7F7F8] border border-[#ECECEC] px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#1A1A1E]" />
            <span className="font-stamp text-xs font-bold tabular-nums text-[#1A1A1E]">{nbActifs} Actifs</span>
            <span className="text-[#ECECEC]">|</span>
            <span className="font-stamp text-xs font-bold tabular-nums text-[#E8433D]">{nbPauses} Pause</span>
            <span className="text-[#ECECEC]">|</span>
            <span className="font-stamp text-xs font-bold tabular-nums text-[#8A8A92]">{nbInactifs} Inactifs</span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Chauffeurs Rattachés', value: CHAUFFEURS_RATTACHES.length, icon: 'local_shipping', sub: `${nbActifs} en activité`, accent: true },
          { label: 'Flotte assignée', value: CHAUFFEURS_RATTACHES.length, icon: 'directions_car', sub: `${nbActifs} véhicules opé.`, accent: false },
          { label: 'Total missions réalisées', value: CHAUFFEURS_RATTACHES.reduce((s, c) => s + c.missions, 0), icon: 'route', sub: 'Depuis création', accent: false },
        ].map((s, i) => (
          <div key={i} className={`waybill-card p-5 flex flex-col justify-between relative overflow-hidden border-l-4 ${s.accent ? 'border-l-[#E8433D]' : 'border-l-[#1A1A1E]'}`}>
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded p-2 border ${s.accent ? 'bg-[#E8433D]/10 text-[#E8433D] border-[#E8433D]/20' : 'bg-[#F7F7F8] text-[#1A1A1E] border-[#ECECEC]'}`}>
                <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
              </div>
            </div>
            <div>
              <p className="font-display text-[11px] uppercase tracking-widest text-[#8A8A92] font-semibold">{s.label}</p>
              <p className="font-display text-3xl font-bold mt-1 text-[#1A1A1E] tabular-nums">{s.value}</p>
              <p className="font-body text-xs text-[#8A8A92] mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center rounded-xl border border-[#ECECEC] bg-[#F7F7F8] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} type="text"
              placeholder="Rechercher un chauffeur, une plaque..."
              className="w-72 h-10 rounded-lg border-2 border-[#ECECEC] bg-white py-2 pl-11 pr-4 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]" />
          </div>
          {[
            { k: 'tous',    l: 'Tous',     n: CHAUFFEURS_RATTACHES.length },
            { k: 'actif',   l: 'Actifs',   n: nbActifs },
            { k: 'pause',   l: 'En pause', n: nbPauses },
            { k: 'inactif', l: 'Désactivés', n: nbInactifs },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 font-display text-[11px] font-bold uppercase tracking-wide transition-all
                ${filter === f.k
                  ? 'border-[#E8433D] bg-[#E8433D] text-white shadow-sm'
                  : 'border-[#ECECEC] bg-white text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E]'}`}>
              {f.l}
              <span className={`px-1.5 rounded text-[10px] ${filter === f.k ? 'bg-white/20 text-white' : 'bg-[#F7F7F8] text-[#8A8A92]'}`}>{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <section className="overflow-hidden rounded-xl border-2 border-[#ECECEC] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#ECECEC] bg-[#F7F7F8]">
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Chauffeur</th>
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Véhicule · Plaque</th>
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Performance</th>
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Ancienneté</th>
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Statut</th>
                <th className="px-6 py-4 text-right font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC]/70">
              {list.map((c) => {
                const sStyle = STATUT_STYLE[c.statut]
                return (
                  <tr key={c.id} className="transition-colors hover:bg-[#F7F7F8]/60 group">
                    <td className="px-6 py-4">
                      <button onClick={() => onNavigate && onNavigate('chauffeur_detail', { id: c.id })}
                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8433D] text-white font-stamp text-sm font-bold border-2 border-[#E8433D]/30 shadow-sm">
                          {c.initials}
                        </div>
                        <div>
                          <p className="font-display text-base font-bold text-[#1A1A1E] uppercase tracking-wide">
                            {c.prenom} {c.nom}
                          </p>
                          <p className="font-body text-xs text-[#8A8A92] mt-0.5">
                            <span className="font-stamp text-[10px] text-[#E8433D] mr-2 font-bold">{c.id}</span>
                            {c.telephone} · CIN {c.cin.substring(0, 9)}…
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="license-plate-tag text-[12px] mb-1">{c.plaque}</span>
                          <span className="font-body text-xs font-semibold text-[#1A1A1E]">{c.vehicule}</span>
                          <span className="font-body text-[11px] text-[#8A8A92]">{c.typeVehicule} · {c.capacite}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between w-48">
                          <span className="font-body text-[11px] text-[#8A8A92]">Missions</span>
                          <span className="font-stamp text-xs font-bold tabular-nums text-[#1A1A1E]">{c.missions}</span>
                        </div>
                        <div className="h-1.5 w-48 rounded-full bg-[#ECECEC] overflow-hidden">
                          <div className="h-full bg-[#E8433D] rounded-full"
                            style={{ width: `${Math.min(100, (c.missions / 350) * 100)}%` }} />
                        </div>
                        <div className="flex items-center justify-between w-48">
                          <span className="font-body text-[11px] text-[#8A8A92]">KM · Note</span>
                          <span className="font-stamp text-[10px] font-bold tabular-nums text-[#8A8A92]">{c.kmTotal} · {c.note}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-[#1A1A1E]">{c.since}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-stamp font-bold tracking-wide border-2 ${sStyle.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sStyle.dot} ${c.statut === 'Actif' ? 'animate-pulse' : ''}`} />
                        {c.statut.toUpperCase()}
                      </span>
                      <p className="font-stamp text-[10px] text-[#8A8A92] mt-1.5 ml-1">{c.permis}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button title="Modifier"
                          onClick={() => alert(`Modifier les informations de ${c.prenom} ${c.nom}`)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[#ECECEC] bg-white font-display text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] hover:bg-[#F7F7F8] transition-all">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Modifier
                        </button>
                        <button title="Désactiver / Réactiver"
                          onClick={() => toggleDesactiver(c)}
                          className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 font-display text-[11px] font-bold uppercase tracking-wider transition-all
                            ${c.statut === 'Désactivé'
                              ? 'border-[#1A1A1E] bg-[#1A1A1E] text-white hover:bg-[#333]'
                              : 'border-[#E8433D]/50 bg-white text-[#E8433D] hover:bg-[#E8433D]/10 hover:border-[#E8433D]'}`}>
                          <span className="material-symbols-outlined text-[16px]">
                            {c.statut === 'Désactivé' ? 'check_circle' : 'block'}
                          </span>
                          {c.statut === 'Désactivé' ? 'Réactiver' : 'Désactiver'}
                        </button>
                        <button title="Voir détail"
                          onClick={() => onNavigate && onNavigate('chauffeur_detail', { id: c.id })}
                          className="p-2 rounded-lg border-2 border-[#ECECEC] bg-white text-[#8A8A92] hover:border-[#E8433D] hover:text-[#E8433D] transition-all">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 && (
          <div className="py-12 text-center text-[#8A8A92]">
            <span className="material-symbols-outlined text-5xl opacity-30">person_off</span>
            <p className="font-body text-sm mt-2">Aucun chauffeur ne correspond aux critères</p>
          </div>
        )}
        <div className="flex items-center justify-between border-t-2 border-[#ECECEC] bg-[#F7F7F8] px-6 py-4">
          <p className="font-display text-[11px] uppercase tracking-wider text-[#8A8A92] font-semibold">
            Affichage de 1-{list.length} sur {CHAUFFEURS_RATTACHES.length} chauffeurs rattachés
          </p>
          <div className="flex gap-2">
            <button className="rounded-lg border-2 border-[#ECECEC] px-3 py-1.5 bg-white transition-colors hover:bg-[#F7F7F8] text-[#8A8A92]" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="rounded-lg border-2 border-[#E8433D] bg-[#E8433D] px-3 py-1.5 font-stamp text-xs font-bold text-white">1</button>
            <button className="rounded-lg border-2 border-[#ECECEC] px-3 py-1.5 bg-white font-stamp text-xs text-[#8A8A92] transition-colors hover:bg-[#F7F7F8] hover:text-[#1A1A1E]">2</button>
            <button className="rounded-lg border-2 border-[#ECECEC] px-3 py-1.5 bg-white transition-colors hover:bg-[#F7F7F8] text-[#8A8A92]">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation modal */}
      {showConfirm && (
        <>
          <div className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-[2px]" onClick={() => setShowConfirm(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
            <div className="rounded-xl border-2 border-[#ECECEC] bg-white shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#E8433D]/10 border-2 border-[#E8433D]/30 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-[#E8433D]">warning_amber</span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight text-[#1A1A1E]">
                      Désactiver le chauffeur
                    </h3>
                    <p className="font-body text-sm text-[#8A8A92] mt-1">
                      Êtes-vous sûr de vouloir désactiver <strong className="text-[#1A1A1E]">{showConfirm.prenom} {showConfirm.nom}</strong> ?
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border-2 border-[#ECECEC] bg-[#F7F7F8] p-3.5 space-y-1">
                  <p className="font-body text-xs text-[#8A8A92]">
                    <span className="font-stamp text-[10px] uppercase font-bold text-[#1A1A1E]">Impact de la désactivation : </span>
                  </p>
                  <ul className="font-body text-xs text-[#1A1A1E] space-y-0.5 ml-2">
                    <li>• Aucune nouvelle mission ne lui sera assignée</li>
                    <li>• Ses missions en cours sont réaffectées</li>
                    <li>• L'historique est conservé (action réversible)</li>
                  </ul>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowConfirm(null)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-[#ECECEC] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Annuler
                  </button>
                  <button onClick={() => { alert(`Chauffeur ${showConfirm.prenom} ${showConfirm.nom} désactivé.`); setShowConfirm(null) }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#E8433D] px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#B82823] active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-[18px]">block</span>
                    Confirmer désactivation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
