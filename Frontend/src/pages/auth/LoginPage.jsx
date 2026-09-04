import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../../components/Logo'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const userData = await login(form.email, form.password)
      navigate(userData.redirectPath, { replace: true })
    } catch (err) {
      setError(err.message || 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const handleFocus = (e) => {
    const icon = e.target.closest('.relative')?.querySelector('.material-symbols-outlined')
    if (icon) icon.style.color = '#E8433D'
  }

  const handleBlur = (e) => {
    const icon = e.target.closest('.relative')?.querySelector('.material-symbols-outlined')
    if (icon) icon.style.color = '#8A8A92'
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#F7F7F8] text-[#1A1A1E] p-4 md:p-6">

      {/* ===== SUBTLE FREIGHT & WAYBILL EXPEDITION BACKGROUND FILIGREE ===== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full opacity-4" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="freight-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1A1A1E" strokeWidth="1" strokeDasharray="3 3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#freight-grid)" />
        </svg>

        <svg className="absolute -right-20 -top-20 h-96 w-96 opacity-[0.05] text-[#E8433D]" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
          <circle cx="100" cy="100" r="50" stroke="#1A1A1E" strokeWidth="2" />
          <path d="M 20 100 L 180 100 M 100 20 L 100 180" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <svg className="absolute -left-20 -bottom-20 h-96 w-96 opacity-[0.05] text-[#1A1A1E]" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="75" stroke="#E8433D" strokeWidth="2" />
          <path d="M 10 100 Q 50 20, 100 100 T 190 100" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        <div className="absolute top-10 left-10 hidden xl:flex flex-col items-center opacity-[0.06] pointer-events-none select-none">
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-[#1A1A1E] flex items-center justify-center rotate-[-12deg]">
            <span className="font-stamp text-xs uppercase font-bold text-center leading-tight">EXPÉDITION<br/>RN7 CORRIDOR<br/>★ MADA ★</span>
          </div>
        </div>

        <div className="absolute bottom-10 right-10 hidden xl:flex flex-col items-center opacity-[0.05] pointer-events-none select-none">
          <div className="h-32 w-32 rounded-full border-4 border-solid border-[#E8433D] flex items-center justify-center rotate-[8deg]">
            <span className="font-stamp text-xs uppercase font-bold text-center leading-tight text-[#E8433D]">BORDEREAU DE ROUTE<br/>CONFORME<br/>2026</span>
          </div>
        </div>
      </div>

      {/* ===== MAIN RE-CENTERED LOGIN CONTAINER ===== */}
      <main className="relative z-10 flex w-full max-w-[420px] flex-col items-center space-y-6 md:max-w-[460px] my-auto">

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3.5 bg-white rounded-2xl border-2 border-[#D7DAE0] shadow-md transition-transform hover:scale-105">
            <Logo size={60} showText={false} />
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-tight">
              <span className="text-[#1A1A1E]">Mada</span><span className="text-[#E8433D]">Logistix</span>
            </h1>
            <div className="inline-flex items-center gap-2 pt-0.5">
              <span className="stamp-badge stamp-badge-red text-[11px]">PORTAIL SÉCURISÉ</span>
              <span className="font-display text-xs uppercase tracking-widest text-[#64646E] font-bold">RN7 FRET</span>
            </div>
          </div>
          <p className="font-body text-xs text-[#64646E] max-w-xs leading-relaxed">
            Plateforme de groupage & gestion logistique terrain Madagascar
          </p>
        </div>

        <div className="w-full rounded-xl border-2 border-[#D7DAE0] bg-white p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />

          <div className="flex items-center justify-between border-b border-[#D7DAE0]/70 pb-4 mb-6 pt-1">
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-[#64646E] font-bold">BORDEREAU D'AUTHENTIFICATION</p>
              <p className="font-mono text-xs text-[#E8433D] font-bold mt-0.5">#AUT-2026-RN7</p>
            </div>
            <span className="license-plate-tag text-xs shadow-sm">MAD-2026</span>
          </div>

          {error && (
            <div className="mb-4 rounded border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3 text-center">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-[#E8433D]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="block font-display text-xs uppercase tracking-wider font-bold text-[#1A1A1E]" htmlFor="email">
                Adresse email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92] transition-colors">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                  className="h-11 w-full rounded border-2 border-[#D7DAE0] bg-white py-2.5 pl-11 pr-4 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-display text-xs uppercase tracking-wider font-bold text-[#1A1A1E]" htmlFor="password">
                Mot de passe
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92] transition-colors">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                  minLength={8}
                  className="h-11 w-full rounded border-2 border-[#D7DAE0] bg-white py-2.5 pl-11 pr-11 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8A92] hover:text-[#E8433D] transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-3 rounded bg-[#E8433D] font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    VÉRIFICATION EN COURS...
                  </>
                ) : (
                  <>
                    S'IDENTIFIER & ACCÉDER
                    <span className="material-symbols-outlined text-xl">login</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-1.5 text-center">
          <p className="font-body text-xs text-[#64646E]">
            Besoin d'assistance terrain ? <a href="#" className="font-display font-bold uppercase tracking-wider text-[#E8433D] hover:underline">Support Logistique</a>
          </p>
          <p className="font-mono text-[11px] font-bold tracking-widest text-[#8A8A92] uppercase">
            VERSION OPERATIVE 2.4.0 · RN7 MADAGASCAR
          </p>
        </div>

        <div className="w-full space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#ECECEC]" />
            <span className="font-display text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold">Pas encore inscrit ?</span>
            <div className="flex-1 h-px bg-[#ECECEC]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => navigate('/inscription/client')}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-[#ECECEC] bg-white p-3 transition-all hover:border-[#E8433D] hover:shadow-md group"
            >
              <span className="material-symbols-outlined text-[24px] text-[#8A8A92] group-hover:text-[#E8433D] transition-colors">person_add</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#1A1A1E] group-hover:text-[#E8433D] transition-colors text-center leading-tight">
                Inscription client
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/inscription/agence')}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-[#ECECEC] bg-white p-3 transition-all hover:border-[#E8433D] hover:shadow-md group"
            >
              <span className="material-symbols-outlined text-[24px] text-[#8A8A92] group-hover:text-[#E8433D] transition-colors">business</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#1A1A1E] group-hover:text-[#E8433D] transition-colors text-center leading-tight">
                Inscrire mon agence
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/inscription/chauffeur')}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-[#ECECEC] bg-white p-3 transition-all hover:border-[#E8433D] hover:shadow-md group"
            >
              <span className="material-symbols-outlined text-[24px] text-[#8A8A92] group-hover:text-[#E8433D] transition-colors">local_shipping</span>
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#1A1A1E] group-hover:text-[#E8433D] transition-colors text-center leading-tight">
                Inscription chauffeur
              </span>
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full text-center font-display text-xs uppercase tracking-wider text-[#8A8A92] flex flex-col sm:flex-row items-center justify-between gap-2 pt-4">
        <p>&copy; 2026 MadaLogistix. Fret & Groupage Madagascar.</p>
        <div className="flex gap-4 font-semibold">
          <a href="#" className="hover:text-[#E8433D] transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-[#E8433D] transition-colors">Conditions Générales</a>
        </div>
      </footer>
    </div>
  )
}

export default LoginPage
