import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const onNavigate = (key) => navigate(`/admin/${key}`)
  const [stats, setStats] = useState({ agences: 0, freelances: 0, total: 0 })
  const [demandesAgences, setDemandesAgences] = useState([])
  const [demandesFreelances, setDemandesFreelances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [agences, freelances] = await Promise.all([
          adminService.listAgences('EN_ATTENTE'),
          adminService.listFreelances('EN_ATTENTE'),
        ])
        setDemandesAgences(agences)
        setDemandesFreelances(freelances)
        setStats({
          agences: agences.length,
          freelances: freelances.length,
          total: agences.length + freelances.length,
        })
      } catch {
        // Silencieux — dashboard se remplit avec 0
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const allPending = [
    ...demandesAgences.map(a => ({
      type: 'agence',
      id: a.tenantId,
      nom: a.nomEntreprise,
      date: a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR') : '—',
      icon: 'apartment',
    })),
    ...demandesFreelances.map(f => ({
      type: 'freelance',
      id: f.chauffeurId,
      nom: f.nom || 'Inconnu',
      date: f.createdAt ? new Date(f.createdAt).toLocaleDateString('fr-FR') : '—',
      icon: 'hail',
    })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
          Vue d'ensemble
        </h1>
        <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
          Tableau de bord de la plateforme MadaLogistix
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#E8433D' }}>pending_actions</span>
            </div>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Demandes en attente</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            {loading ? '—' : stats.total}
          </p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#1A1A1E' }}>apartment</span>
            </div>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Agences en attente</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            {loading ? '—' : stats.agences}
          </p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#1A1A1E' }}>hail</span>
            </div>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Freelances en attente</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            {loading ? '—' : stats.freelances}
          </p>
        </div>
      </div>

      {/* Demandes en attente */}
      <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-headline-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
            Demandes en attente
          </h2>
          {!loading && allPending.length > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}>
              {allPending.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#E8433D]/20 border-t-[#E8433D] rounded-full animate-spin" />
          </div>
        ) : allPending.length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-[32px]" style={{ color: '#ECECEC' }}>check_circle</span>
            <p className="font-body text-body-sm mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              Aucune demande en attente
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allPending.map((d) => (
              <button
                key={d.id}
                onClick={() => onNavigate(d.type === 'agence' ? 'agences_demandes' : 'freelances_demandes')}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:opacity-80"
                style={{ backgroundColor: '#F7F7F8' }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#E8433D' }}>{d.icon}</span>
                <div className="flex-1">
                  <p className="font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{d.nom}</p>
                  <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{d.date}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#FFFFFF', color: '#8A8A92', border: '1px solid #ECECEC' }}>
                  {d.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation rapide */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          onClick={() => onNavigate('agences_liste')}
          className="flex items-center gap-4 rounded-xl border p-5 text-left transition-all hover:shadow-sm"
          style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
            <span className="material-symbols-outlined text-[24px]" style={{ color: '#E8433D' }}>apartment</span>
          </div>
          <div>
            <p className="font-display text-body-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>Agences actives</p>
            <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>Voir le répertoire</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('freelances_liste')}
          className="flex items-center gap-4 rounded-xl border p-5 text-left transition-all hover:shadow-sm"
          style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
            <span className="material-symbols-outlined text-[24px]" style={{ color: '#1A1A1E' }}>hail</span>
          </div>
          <div>
            <p className="font-display text-body-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>Freelances actifs</p>
            <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>Voir le répertoire</p>
          </div>
        </button>
      </div>
    </div>
  )
}
