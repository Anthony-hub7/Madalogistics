import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chauffeursService } from '../../services/chauffeursService'

const STATUT_STYLE = {
  VALIDEE:     { badge: 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]', dot: 'bg-[#1A1A1E]' },
  EN_ATTENTE:  { badge: 'bg-[#F7F7F8] text-[#E8433D] border-[#E8433D]/60', dot: 'bg-[#E8433D]' },
  DESACTIVEE:  { badge: 'bg-[#F7F7F8] text-[#8A8A92] border-[#ECECEC]', dot: 'bg-[#8A8A92]' },
  REFUSEE:     { badge: 'bg-[#F7F7F8] text-[#E8433D] border-[#E8433D]', dot: 'bg-[#E8433D]' },
}

const STATUT_LABELS = {
  VALIDEE: 'Actif',
  EN_ATTENTE: 'En attente',
  DESACTIVEE: 'Desactive',
  REFUSEE: 'Refuse',
}

export default function ChauffeursRattachesPage() {
  const navigate = useNavigate()
  const [chauffeurs, setChauffeurs] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await chauffeursService.lister()
        if (!cancelled) setChauffeurs(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          if (err?.response?.status === 403) {
            setError('Acces refuse : vous n\'avez pas les droits pour consulter les chauffeurs.')
          } else {
            setError('Impossible de charger les chauffeurs.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const list = chauffeurs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (c.nom && c.nom.toLowerCase().includes(q))
      || (c.email && c.email.toLowerCase().includes(q))
      || (c.immatriculation && c.immatriculation.toLowerCase().includes(q))
    const matchFilter = filter === 'tous'
      || (filter === 'actif' && c.statutDossier === 'VALIDEE')
      || (filter === 'attente' && c.statutDossier === 'EN_ATTENTE')
      || (filter === 'inactif' && (c.statutDossier === 'DESACTIVEE' || c.statutDossier === 'REFUSEE'))
    return matchSearch && matchFilter
  })

  const nbValid = chauffeurs.filter(c => c.statutDossier === 'VALIDEE').length
  const nbAttente = chauffeurs.filter(c => c.statutDossier === 'EN_ATTENTE').length
  const nbInactive = chauffeurs.filter(c => c.statutDossier === 'DESACTIVEE' || c.statutDossier === 'REFUSEE').length

  const getInitiales = (nom) => {
    if (!nom) return '??'
    return nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-[#ECECEC] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-stamp text-[11px] uppercase px-2.5 py-1 rounded bg-[#E8433D]/10 text-[#E8433D] border border-[#E8433D]/30 font-bold">
              RATTACHEMENT AGENCE
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#1A1A1E] uppercase tracking-tight mt-1.5">
            Chauffeurs rattaches
          </h2>
          <p className="font-body text-sm text-[#8A8A92] mt-1">
            Consultez les chauffeurs rattaches a votre agence. La validation est geree par la Direction.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[#F7F7F8] border border-[#ECECEC] px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#1A1A1E]" />
            <span className="font-stamp text-xs font-bold tabular-nums text-[#1A1A1E]">{nbValid} Actifs</span>
            <span className="text-[#ECECEC]">|</span>
            <span className="font-stamp text-xs font-bold tabular-nums text-[#E8433D]">{nbAttente} Attente</span>
            <span className="text-[#ECECEC]">|</span>
            <span className="font-stamp text-xs font-bold tabular-nums text-[#8A8A92]">{nbInactive} Inactifs</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Chauffeurs rattaches', value: chauffeurs.length, icon: 'local_shipping', sub: `${nbValid} en activite`, accent: true },
          { label: 'En attente validation', value: nbAttente, icon: 'pending', sub: 'Dossier a traiter', accent: false },
          { label: 'Chauffeurs validates', value: nbValid, icon: 'verified', sub: 'Peuvent conduire', accent: false },
        ].map((s, i) => (
          <div key={i} className={`waybill-card p-5 flex flex-col justify-between relative overflow-hidden border-l-4 ${s.accent ? 'border-l-[#E8433D]' : 'border-l-[#1A1A1E]'}`}>
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded p-2 border ${s.accent ? 'bg-[#E8433D]/10 text-[#E8433D] border-[#E8433D]/20' : 'bg-[#F7F7F8] text-[#1A1A1E] border-[#ECECEC]'}`}>
                <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
              </div>
            </div>
            <div>
              <p className="font-display text-[11px] uppercase tracking-widest text-[#8A8A92] font-semibold">{s.label}</p>
              <p className="font-display text-3xl font-bold mt-1 text-[#1A1A1E] tabular-nums">{loading ? '...' : s.value}</p>
              <p className="font-body text-xs text-[#8A8A92] mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-4 text-sm text-[#E8433D]">{error}</div>
      )}

      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center rounded-xl border border-[#ECECEC] bg-[#F7F7F8] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} type="text"
              placeholder="Rechercher un chauffeur..."
              className="w-72 h-10 rounded-lg border-2 border-[#ECECEC] bg-white py-2 pl-11 pr-4 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]" />
          </div>
          {[
            { k: 'tous',    l: 'Tous',       n: chauffeurs.length },
            { k: 'actif',   l: 'Actifs',     n: nbValid },
            { k: 'attente', l: 'En attente', n: nbAttente },
            { k: 'inactif', l: 'Inactifs',   n: nbInactive },
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

      <section className="overflow-hidden rounded-xl border-2 border-[#ECECEC] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#ECECEC] bg-[#F7F7F8]">
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Chauffeur</th>
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Vehicule</th>
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Permis</th>
                <th className="px-6 py-4 font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Statut</th>
                <th className="px-6 py-4 text-right font-display text-[11px] uppercase tracking-widest font-bold text-[#8A8A92]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC]/70">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[#8A8A92]">Chargement...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[#8A8A92]">
                  <span className="material-symbols-outlined text-5xl opacity-30">person_off</span>
                  <p className="font-body text-sm mt-2">Aucun chauffeur ne correspond aux criteres</p>
                </td></tr>
              ) : list.map((c) => {
                const sStyle = STATUT_STYLE[c.statutDossier] || STATUT_STYLE.EN_ATTENTE
                const labelStatut = STATUT_LABELS[c.statutDossier] || c.statutDossier
                return (
                  <tr key={c.chauffeurId} className="transition-colors hover:bg-[#F7F7F8]/60 group">
                    <td className="px-6 py-4">
                      <button onClick={() => navigate(`/logistics/chauffeur_detail?id=${c.chauffeurId}`)}
                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8433D] text-white font-stamp text-sm font-bold border-2 border-[#E8433D]/30 shadow-sm">
                          {getInitiales(c.nom)}
                        </div>
                        <div>
                          <p className="font-display text-base font-bold text-[#1A1A1E] uppercase tracking-wide">
                            {c.nom || 'Inconnu'}
                          </p>
                          <p className="font-body text-xs text-[#8A8A92] mt-0.5">
                            {c.email || '—'} {c.telephone ? `· ${c.telephone}` : ''}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {c.immatriculation ? (
                          <>
                            <span className="license-plate-tag text-[12px] mb-1">{c.immatriculation}</span>
                            <span className="font-body text-xs font-semibold text-[#1A1A1E]">{c.marqueModele || '—'}</span>
                          </>
                        ) : (
                          <span className="font-body text-xs italic text-[#8A8A92]">Non assigne</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-body text-xs text-[#1A1A1E]">
                        {c.permisCategorie || '—'} {c.permisExpiration ? `· Exp. ${c.permisExpiration}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-stamp font-bold tracking-wide border-2 ${sStyle.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sStyle.dot} ${c.statutDossier === 'VALIDEE' ? 'animate-pulse' : ''}`} />
                        {labelStatut.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button title="Voir detail"
                        onClick={() => navigate(`/logistics/chauffeur_detail?id=${c.chauffeurId}`)}
                        className="p-2 rounded-lg border-2 border-[#ECECEC] bg-white text-[#8A8A92] hover:border-[#E8433D] hover:text-[#E8433D] transition-all">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t-2 border-[#ECECEC] bg-[#F7F7F8] px-6 py-4">
          <p className="font-display text-[11px] uppercase tracking-wider text-[#8A8A92] font-semibold">
            Affichage de {list.length} chauffeur{list.length !== 1 ? 's' : ''} sur {chauffeurs.length}
          </p>
        </div>
      </section>
    </div>
  )
}
