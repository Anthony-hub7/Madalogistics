import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../../components/Logo'

function InscriptionClientPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ nom: '', email: '', motDePasse: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const valid = form.nom && form.email && form.motDePasse && form.confirm
    && form.motDePasse === form.confirm
    && form.motDePasse.length >= 8

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    setError('')
    try {
      const userData = await register({
        nom: form.nom,
        email: form.email,
        motDePasse: form.motDePasse,
      })
      navigate(userData.redirectPath, { replace: true })
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription")
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

      {/* ===== BACKGROUND FILIGREE ===== */}
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

      {/* ===== MAIN CONTAINER ===== */}
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
              <span className="stamp-badge stamp-badge-red text-[11px]">INSCRIPTION CLIENT</span>
              <span className="font-display text-xs uppercase tracking-widest text-[#64646E] font-bold">RN7 FRET</span>
            </div>
          </div>
          <p className="font-body text-xs text-[#64646E] max-w-xs leading-relaxed">
            Créez votre compte client pour suivre vos expéditions
          </p>
        </div>

        <div className="w-full rounded-xl border-2 border-[#D7DAE0] bg-white p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />

          <div className="flex items-center justify-between border-b border-[#D7DAE0]/70 pb-4 mb-6 pt-1">
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-[#64646E] font-bold">BORDEREAU D'INSCRIPTION</p>
              <p className="font-mono text-xs text-[#E8433D] font-bold mt-0.5">#INS-2026-RN7</p>
            </div>
            <span className="license-plate-tag text-xs shadow-sm">CLIENT</span>
          </div>

          {error && (
            <div className="mb-4 rounded border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3 text-center">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-[#E8433D]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nom complet */}
            <div className="space-y-1.5">
              <label className="block font-display text-xs uppercase tracking-wider font-bold text-[#1A1A1E]" htmlFor="nom">
                Nom complet
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92] transition-colors">
                  person
                </span>
                <input
                  id="nom"
                  type="text"
                  placeholder="Rakoto Andrianaivo"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                  className="h-11 w-full rounded border-2 border-[#D7DAE0] bg-white py-2.5 pl-11 pr-4 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]"
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <label className="block font-display text-xs uppercase tracking-wider font-bold text-[#1A1A1E]" htmlFor="motDePasse">
                Mot de passe
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92] transition-colors">
                  lock
                </span>
                <input
                  id="motDePasse"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 caractères"
                  value={form.motDePasse}
                  onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
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

            {/* Confirmer le mot de passe */}
            <div className="space-y-1.5">
              <label className="block font-display text-xs uppercase tracking-wider font-bold text-[#1A1A1E]" htmlFor="confirm">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92] transition-colors">
                  lock_reset
                </span>
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Répéter le mot de passe"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                  minLength={8}
                  className={`h-11 w-full rounded border-2 bg-white py-2.5 pl-11 pr-11 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]
                    ${form.confirm && form.motDePasse !== form.confirm ? 'border-[#E8433D]' : 'border-[#D7DAE0]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8A92] hover:text-[#E8433D] transition-colors"
                  aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {form.confirm && form.motDePasse !== form.confirm && (
                <p className="font-body text-[11px] text-[#E8433D]">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !valid}
                className="flex h-12 w-full items-center justify-center gap-3 rounded bg-[#E8433D] font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    CRÉATION EN COURS...
                  </>
                ) : (
                  <>
                    CRÉER MON COMPTE
                    <span className="material-symbols-outlined text-xl">how_to_reg</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-1.5 text-center">
          <p className="font-body text-xs text-[#64646E]">
            Déjà inscrit ?{' '}
            <button onClick={() => navigate('/')} className="font-display font-bold uppercase tracking-wider text-[#E8433D] hover:underline">
              Se connecter
            </button>
          </p>
          <p className="font-mono text-[11px] font-bold tracking-widest text-[#8A8A92] uppercase">
            VERSION OPERATIVE 2.4.0 · RN7 MADAGASCAR
          </p>
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

export default InscriptionClientPage
