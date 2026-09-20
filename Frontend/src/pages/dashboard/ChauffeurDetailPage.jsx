import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { chauffeursService } from '../../services/chauffeursService'

export default function ChauffeurDetailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chauffeurId = searchParams.get('id')
  const [chauffeur, setChauffeur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('general')

  useEffect(() => {
    if (!chauffeurId) {
      setError('Aucun chauffeur specifie.')
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const data = await chauffeursService.detail(chauffeurId)
        if (!cancelled) setChauffeur(data)
      } catch (err) {
        if (!cancelled) setError('Impossible de charger les details du chauffeur.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [chauffeurId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center text-[#8A8A92]">Chargement...</div>
      </div>
    )
  }

  if (error || !chauffeur) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/logistics/chauffeurs_rattaches')}
          className="inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Retour aux chauffeurs rattaches
        </button>
        <div className="rounded-xl border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-6 text-center text-[#E8433D]">
          {error || 'Chauffeur introuvable'}
        </div>
      </div>
    )
  }

  const c = chauffeur
  const getInitiales = (nom) => {
    if (!nom) return '??'
    return nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  const statutBadge = c.statutDossier === 'VALIDEE'
    ? { label: 'ACTIF', cls: 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]', dot: 'bg-[#1A1A1E] animate-pulse' }
    : c.statutDossier === 'EN_ATTENTE'
    ? { label: 'EN ATTENTE', cls: 'bg-[#F7F7F8] text-[#E8433D] border-[#E8433D]', dot: 'bg-[#E8433D]' }
    : { label: 'INACTIF', cls: 'bg-[#F7F7F8] text-[#8A8A92] border-[#ECECEC]', dot: 'bg-[#8A8A92]' }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/logistics/chauffeurs_rattaches')}
        className="inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors">
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        Retour aux chauffeurs rattaches
      </button>

      <section className="rounded-xl border-2 border-[#ECECEC] bg-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
        <div className="flex items-center justify-between border-b-2 border-[#ECECEC] bg-[#F7F7F8] px-6 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="stamp-badge stamp-badge-neutral font-stamp text-[10px]">FICHE CHAUFFEUR</span>
            </div>
            <p className="font-stamp text-sm text-[#E8433D] font-bold">
              DOSSIER {c.chauffeurId?.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {c.immatriculation && <span className="license-plate-tag text-sm tracking-[0.15em]">{c.immatriculation}</span>}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-stamp font-bold tracking-wide border-2 ${statutBadge.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statutBadge.dot}`} />
              {statutBadge.label}
            </span>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-[#E8433D] text-white font-stamp text-2xl font-bold flex items-center justify-center border-4 border-[#E8433D]/20 shadow-md">
                {getInitiales(c.nom)}
              </div>
              {c.permisCategorie && (
                <div className="absolute -bottom-2 -right-2 rounded-full border-4 border-white bg-[#1A1A1E] text-white px-2 py-0.5 font-stamp text-[10px] font-bold">
                  {c.permisCategorie}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-bold text-[#1A1A1E] uppercase tracking-tight">
                {c.nom || 'Inconnu'}
              </h1>
              <p className="font-stamp text-[11px] text-[#E8433D] font-bold uppercase tracking-wider">
                CHAUFFEUR RATTACHE
              </p>
              <p className="font-body text-sm text-[#8A8A92] mt-2">
                {c.email || '—'} {c.telephone ? `· ${c.telephone}` : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 border-b-2 border-[#ECECEC] bg-[#F7F7F8] px-2 rounded-t-xl">
        {[
          { k: 'general', l: 'Identite & Permis', i: 'person' },
          { k: 'vehicule', l: 'Vehicule assigne', i: 'local_shipping' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`inline-flex items-center gap-2 px-4 py-3 font-display text-[12px] font-bold uppercase tracking-wider border-b-3 transition-all relative
              ${tab === t.k ? 'text-[#E8433D]' : 'text-[#8A8A92] hover:text-[#1A1A1E]'}`}>
            <span className="material-symbols-outlined text-[18px]">{t.i}</span>
            {t.l}
            {tab === t.k && <span className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-[#E8433D]" />}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="waybill-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#E8433D]">badge</span>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#1A1A1E]">Identite</h3>
            </div>
            <div className="space-y-3">
              {[
                { l: 'Nom complet', v: c.nom || '—' },
                { l: 'Telephone', v: c.telephone || '—' },
                { l: 'Email', v: c.email || '—' },
                { l: 'Statut dossier', v: c.statutDossier || '—' },
                { l: 'Type chauffeur', v: c.typeChauffeur || '—' },
                { l: 'Disponible', v: c.disponible ? 'Oui' : 'Non' },
              ].map(row => (
                <div key={row.l} className="flex items-start justify-between py-2 border-b border-[#ECECEC] last:border-0">
                  <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92] min-w-[140px]">{row.l}</span>
                  <span className="font-body text-sm text-[#1A1A1E] text-right font-semibold">{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="waybill-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#E8433D]">local_police</span>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#1A1A1E]">Permis de conduire</h3>
            </div>
            <div className="rounded-xl border-2 border-[#1A1A1E] bg-[#F7F7F8] p-5 relative overflow-hidden">
              <div className="space-y-3 relative z-10">
                {[
                  { l: 'Categorie', v: c.permisCategorie || '—', highlight: true },
                  { l: 'Categories', v: c.permisCategories || '—' },
                  { l: 'Expiration', v: c.permisExpiration || '—', warn: c.permisExpiration },
                  { l: 'Numero', v: c.permisNumero || '—', mono: true },
                ].map(row => (
                  <div key={row.l} className="flex items-start justify-between py-1.5">
                    <span className="font-stamp text-[10px] uppercase tracking-widest font-bold text-[#8A8A92] min-w-[120px]">{row.l}</span>
                    <span className={`${row.mono ? 'font-mono' : 'font-body'} ${row.highlight ? 'font-stamp text-[#E8433D] font-bold' : 'font-semibold'} text-sm text-right`}>
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {c.hasPermisScan && (
              <div className="flex gap-2 mt-4">
                <a href={chauffeursService.permisUrl(c.chauffeurId)} target="_blank" rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-[#ECECEC] bg-white py-2 font-display text-[11px] font-bold uppercase tracking-wider text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E] transition-all">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Telecharger permis
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'vehicule' && (
        <section className="space-y-6">
          <div className="waybill-card p-6">
            {c.immatriculation ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-[#E8433D] text-[28px]">local_shipping</span>
                  <div>
                    <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-[#1A1A1E]">{c.marqueModele || 'Vehicule assigne'}</h3>
                    <p className="font-stamp text-[11px] text-[#8A8A92] font-bold uppercase tracking-wider">{c.typeVehicule || '—'}</p>
                  </div>
                </div>
                <div className="rounded-2xl border-4 border-[#1A1A1E] bg-[#F7F7F8] px-6 py-4 inline-block">
                  <p className="font-stamp text-[10px] uppercase tracking-[0.25em] text-[#8A8A92] text-center mb-1">IMMATRICULATION</p>
                  <p className="font-stamp text-3xl tracking-[0.25em] text-[#1A1A1E] font-bold tabular-nums">{c.immatriculation}</p>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-[#8A8A92]">
                <span className="material-symbols-outlined text-5xl opacity-30">local_shipping</span>
                <p className="font-body text-sm mt-2">Aucun vehicule assigne a ce chauffeur</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
