import { useState } from 'react'

const MOCK_PROPOSEES_RATTACHE = [
  { id: 'PRP-1042', agence: 'TRANS MADA SARL', client: 'Pharmacie Centrale', destination: 'Antananarivo (Analakely)', depart: 'Antsirabe Hub', poids: '320 kg', volume: '3.2 m³', heure: '07:30', date: '02 Sep 2026', remuneration: '42.000 Ar', distance: '172 km', plaque: 'V-012 (Actros)' },
  { id: 'PRP-1043', agence: 'TRANS MADA SARL', client: 'Supermaki Ivandry', destination: "Ivandry, Route d'Analamahitsy", depart: 'Antananarivo Hub', poids: '85 kg', volume: '1.0 m³', heure: '10:00', date: '02 Sep 2026', remuneration: '15.500 Ar', distance: '8 km', plaque: 'V-018 (Isuzu)' },
  { id: 'PRP-1044', agence: 'TRANS MADA SARL', client: 'Dépôt Construction RN7', destination: 'Ambatolampy', depart: 'Antananarivo Hub', poids: '2.4 T', volume: '12 m³', heure: '06:00', date: '02 Sep 2026', remuneration: '28.000 Ar', distance: '68 km', plaque: 'V-022 (Scania)' },
]

const MOCK_PROPOSEES_FREELANCE = [
  { id: 'PRP-2089', agence: 'TRANS MADA SARL', client: 'Pharmacie Centrale', destination: 'Antananarivo (Analakely)', depart: 'Antsirabe Hub', poids: '320 kg', volume: '3.2 m³', heure: '07:30', date: '02 Sep 2026', remuneration: '42.000 Ar', distance: '172 km', plaque: '—' },
  { id: 'PRP-2090', agence: 'RN7 EXPRESS FRET', client: 'Jovenna Ivato', destination: 'Ivato Aéroport', depart: 'Antananarivo Hub', poids: '140 kg', volume: '2.1 m³', heure: '09:15', date: '02 Sep 2026', remuneration: '18.000 Ar', distance: '14 km', plaque: '—' },
  { id: 'PRP-2091', agence: 'TANA-TSIRABE CARGO', client: 'Usine La Croix du Sud', destination: 'Antsirabe Zone Indus.', depart: 'Antananarivo Hub', poids: '1.8 T', volume: '9 m³', heure: '05:45', date: '02 Sep 2026', remuneration: '35.000 Ar', distance: '170 km', plaque: '—' },
  { id: 'PRP-2092', agence: 'HAUTS PLATEAUX LOGISTIX', client: 'AgriMarket Brousse', destination: 'Betafo', depart: 'Antsirabe Hub', poids: '560 kg', volume: '4.5 m³', heure: '11:00', date: '02 Sep 2026', remuneration: '22.000 Ar', distance: '25 km', plaque: '—' },
  { id: 'PRP-2093', agence: 'CORRIDOR SUD TRANSPORT', client: 'Textiles MADARTEX', destination: 'Ambatolampy Zone Artisanale', depart: 'Antananarivo Hub', poids: '280 kg', volume: '3.0 m³', heure: '14:30', date: '02 Sep 2026', remuneration: '20.500 Ar', distance: '68 km', plaque: '—' },
]

export default function MissionsProposeesPage({ onNavigate }) {
  const isFreelance = true
  const [filter, setFilter] = useState('toutes')
  const [missions, setMissions] = useState(isFreelance ? MOCK_PROPOSEES_FREELANCE : MOCK_PROPOSEES_RATTACHE)
  const [actionOnId, setActionOnId] = useState(null)

  const filtered = missions.filter(m => {
    if (filter === 'toutes') return true
    if (filter === 'court') return (parseFloat(m.distance) || 0) <= 30
    if (filter === 'long') return (parseFloat(m.distance) || 0) > 30
    return true
  })

  const handleAccept = (id) => {
    setActionOnId({ id, type: 'accept' })
    setTimeout(() => {
      setMissions(prev => prev.filter(m => m.id !== id))
      setActionOnId(null)
    }, 700)
  }

  const handleRefuse = (id) => {
    setActionOnId({ id, type: 'refuse' })
    setTimeout(() => {
      setMissions(prev => prev.filter(m => m.id !== id))
      setActionOnId(null)
    }, 500)
  }

  const nbTotal = missions.length
  const nbCourt = missions.filter(m => (parseFloat(m.distance) || 0) <= 30).length
  const nbLong = missions.filter(m => (parseFloat(m.distance) || 0) > 30).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-stamp text-[10px] uppercase font-bold px-2 py-0.5 rounded border-2 ${
                isFreelance
                  ? 'text-[#E8433D] border-[#E8433D] bg-[#E8433D]/10'
                  : 'text-[#1A1A1E] border-[#1A1A1E] bg-[#F7F7F8]'
              }`}>
                {isFreelance ? '★ FREELANCE' : '★ RATTACHÉ'}
              </span>
              <span className="font-mono text-[10px] text-[#8A8A92] font-bold uppercase tracking-wider">
                RN7 CORRIDOR
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E] mt-1">
              Missions proposées
            </h2>
          </div>
          <div className={`px-3 py-1.5 rounded-full font-stamp text-xs font-bold tracking-wide ${
            nbTotal > 0
              ? 'bg-[#E8433D] text-white shadow-md'
              : 'bg-[#ECECEC] text-[#8A8A92]'
          }`}>
            {nbTotal}
          </div>
        </div>
        <p className="font-body text-sm text-[#8A8A92]">
          {isFreelance
            ? 'Propositions de toutes les agences de la plateforme. Choisissez les missions qui vous intéressent.'
            : 'Missions proposées par votre agence TRANS MADA SARL. Vous avez 24h pour y répondre.'}
        </p>
      </section>

      {/* Warning if freelance */}
      {isFreelance && (
        <div className="flex items-start gap-3 rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3.5">
          <span className="material-symbols-outlined text-[20px] text-[#E8433D] mt-0.5 flex-shrink-0">tips_and_updates</span>
          <div>
            <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-0.5">
              Mode Freelance — Toutes agences
            </p>
            <p className="font-body text-xs text-[#1A1A1E] leading-relaxed">
              Vous recevez des missions de <strong>toutes les agences</strong> de la plateforme.
              Taux de commission plateforme : 8% / mission.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'toutes', label: 'Toutes', count: nbTotal, icon: 'receipt_long' },
          { key: 'court', label: 'Courte (< 30 km)', count: nbCourt, icon: 'near_me' },
          { key: 'long', label: 'Longue (> 30 km)', count: nbLong, icon: 'route' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 font-display text-[11px] font-bold uppercase tracking-wide transition-all
              ${filter === f.key
                ? 'border-[#E8433D] bg-[#E8433D] text-white shadow-sm'
                : 'border-[#ECECEC] bg-white text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E]'}`}>
            <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
            {f.label}
            <span className={`ml-0.5 px-1.5 rounded ${
              filter === f.key ? 'bg-white/20 text-white' : 'bg-[#F7F7F8] text-[#8A8A92]'
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Missions list */}
      <div className="space-y-4">
        {filtered.map((m) => {
          const acting = actionOnId?.id === m.id
          const actingType = actionOnId?.type
          return (
            <article key={m.id}
              className={`rounded-xl border-2 border-[#ECECEC] bg-white shadow-sm overflow-hidden relative transition-all duration-300 ${
                acting ? (actingType === 'accept' ? 'translate-x-2 opacity-60 scale-[0.99] border-[#E8433D]/50' : '-translate-x-2 opacity-0 scale-95') : ''
              }`}>
              {/* Top red strip & agency header */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#E8433D]" />
              <div className="flex items-center justify-between border-b border-[#ECECEC] bg-[#F7F7F8] px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#1A1A1E] bg-white font-stamp text-[11px] font-bold text-[#1A1A1E]">
                    {m.agence.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-stamp text-[10px] uppercase font-bold tracking-widest text-[#8A8A92]">
                      {isFreelance ? 'Agence émettrice' : 'Votre agence'}
                    </p>
                    <p className="font-display text-sm font-bold uppercase tracking-wide text-[#1A1A1E]">{m.agence}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="license-plate-tag text-[11px]">{m.id}</span>
                  {isFreelance && m.plaque === '—' ? null : (
                    <span className="license-plate-tag text-[11px] opacity-80">{m.plaque.split(' ')[0]}</span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Route visual: depart -> destination */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-[#E8433D]" />
                    <div className="h-10 w-0.5 border-l-2 border-dashed border-[#ECECEC]" />
                    <div className="h-3 w-3 rounded-full border-2 border-[#1A1A1E] bg-white" />
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <div>
                      <p className="font-stamp text-[9px] uppercase tracking-widest text-[#8A8A92] mb-0.5">DÉPART</p>
                      <p className="font-body text-sm font-semibold text-[#1A1A1E]">{m.depart}</p>
                    </div>
                    <div>
                      <p className="font-stamp text-[9px] uppercase tracking-widest text-[#8A8A92] mb-0.5">LIVRAISON · {m.client}</p>
                      <p className="font-body text-sm font-semibold text-[#1A1A1E]">{m.destination}</p>
                    </div>
                  </div>
                </div>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">monitor_weight</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">{m.poids}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">inventory_2</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">{m.volume}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">schedule</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">{m.heure} · {m.date}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#8A8A92]">route</span>
                    <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[#1A1A1E]">{m.distance}</span>
                  </div>
                </div>

                {/* Divider + Remuneration */}
                <div className="border-t-2 border-dashed border-[#ECECEC] pt-3.5 flex items-end justify-between">
                  <div>
                    <p className="font-stamp text-[9px] uppercase tracking-widest text-[#8A8A92] mb-0.5">Rémunération estimée</p>
                    <p className="font-display text-xl font-bold tabular-nums text-[#E8433D]">
                      {m.remuneration}<span className="text-[#8A8A92] text-xs ml-1">AR</span>
                    </p>
                  </div>
                  {/* Buttons Accept / Refuse */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRefuse(m.id)}
                      disabled={!!acting}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-[#ECECEC] bg-white font-display text-xs font-bold uppercase tracking-wider text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E] active:scale-[0.96] transition-all disabled:opacity-50">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      Refuser
                    </button>
                    <button
                      onClick={() => handleAccept(m.id)}
                      disabled={!!acting}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#E8433D] font-display text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#B82823] active:scale-[0.96] transition-all disabled:opacity-50">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Accepter
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed border-[#ECECEC] bg-white">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#E8433D]/10 animate-ping" style={{ animationDuration: '2.5s' }} />
            <div className="h-20 w-20 rounded-full border-2 border-dashed border-[#E8433D] flex items-center justify-center relative z-10 bg-white">
              <span className="material-symbols-outlined text-[36px] text-[#E8433D]">content_paste_off</span>
            </div>
          </div>
          <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[#1A1A1E] mt-6">
            Plus de missions disponibles
          </h3>
          <p className="font-body text-sm text-[#8A8A92] mt-1.5 max-w-xs">
            Aucune nouvelle proposition pour le moment. Revenez plus tard ou consultez les missions acceptées.
          </p>
          <button onClick={() => onNavigate && onNavigate('missions')}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-[#E8433D] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[18px]">route</span>
            Voir mes missions
          </button>
        </div>
      )}
    </div>
  )
}
