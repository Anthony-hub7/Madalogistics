import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { agencesService } from '../../services/agencesService'
import { useAuth } from '../../hooks/useAuth'

// ─── Shared UI primitives ──────────────────────────────────────────────────────
function PageBg({ children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F7F7F8] flex flex-col items-center justify-start py-8 px-4">
      {/* Grid filigree */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ag-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1A1A1E" strokeWidth="1" strokeDasharray="2 4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ag-grid)" />
        </svg>
        {/* RN7 route motif top-right */}
        <svg className="absolute -right-16 -top-16 h-80 w-80 opacity-[0.04]" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="#E8433D" strokeWidth="3" strokeDasharray="8 6" />
          <circle cx="100" cy="100" r="50" stroke="#1A1A1E" strokeWidth="1.5" />
          <path d="M 20 100 L 180 100 M 100 20 L 100 180" stroke="#E8433D" strokeWidth="1.5" />
        </svg>
        {/* Stamp bottom-left */}
        <div className="absolute bottom-8 left-8 hidden xl:flex opacity-[0.05] pointer-events-none select-none">
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-[#E8433D] flex items-center justify-center rotate-[-8deg]">
            <span className="font-stamp text-[10px] uppercase font-bold text-center leading-tight text-[#E8433D]">INSCRIPTION<br />AGENCE<br />★ RN7 ★</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 w-full max-w-2xl">{children}</div>
    </div>
  )
}

function FormInput({ label, id, icon, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-display text-[11px] uppercase tracking-wider font-bold text-[#1A1A1E]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`h-11 w-full rounded border-2 border-[#ECECEC] bg-white py-2.5 ${icon ? 'pl-11' : 'pl-4'} pr-4 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]`}
          {...props}
        />
      </div>
    </div>
  )
}

// ─── Step Progress Bar ──────────────────────────────────────────────────────
function StepBar({ current, total, labels }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {labels.map((lbl, i) => {
          const idx = i + 1
          const done = current > idx
          const active = current === idx
          return (
            <div key={lbl} className="flex flex-col items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-stamp font-bold text-sm transition-all
                ${done ? 'bg-[#E8433D] border-[#E8433D] text-white' : active ? 'border-[#E8433D] text-[#E8433D] bg-white' : 'border-[#ECECEC] text-[#8A8A92] bg-white'}`}>
                {done ? <span className="material-symbols-outlined text-[16px]">check</span> : idx}
              </div>
              <span className={`mt-1.5 font-display text-[10px] uppercase tracking-wider font-bold text-center leading-tight
                ${active ? 'text-[#E8433D]' : done ? 'text-[#1A1A1E]' : 'text-[#8A8A92]'}`}>
                {lbl}
              </span>
              {i < labels.length - 1 && (
                <div className={`hidden`} />
              )}
            </div>
          )
        })}
      </div>
      {/* Progress line */}
      <div className="h-1.5 w-full rounded-full bg-[#ECECEC] overflow-hidden">
        <div
          className="h-full bg-[#E8433D] rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function WaybillCard({ children, refCode }) {
  return (
    <div className="w-full rounded-xl border-2 border-[#ECECEC] bg-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
      <div className="flex items-center justify-between border-b border-[#ECECEC] px-6 pt-5 pb-4">
        <div>
          <p className="font-display text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold">
            BORDEREAU D'INSCRIPTION — AGENCE DE TRANSPORT
          </p>
          <p className="font-stamp text-xs text-[#E8433D] font-bold mt-0.5">{refCode}</p>
        </div>
        <span className="license-plate-tag text-xs">RN7-AGC</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── STEP 1 : Identification ───────────────────────────────────────────────
function Step1({ data, onChange, onNext, onBack }) {
  const valid = data.raisonSociale && data.nif && data.email && data.telephone && data.adresse
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">
          Identification de l'agence
        </h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          Renseignez les informations légales et de contact de votre agence.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput label="Raison sociale *" id="raisonSociale" icon="business" placeholder="Ex : TRANS MADA SARL"
            value={data.raisonSociale} onChange={e => onChange('raisonSociale', e.target.value)} required />
        </div>
        <FormInput label="NIF / SIRET *" id="nif" icon="badge" placeholder="NIF-000000-0"
          value={data.nif} onChange={e => onChange('nif', e.target.value)} />
        <FormInput label="STAT" id="stat" icon="tag" placeholder="STAT-XXXXXXX"
          value={data.stat} onChange={e => onChange('stat', e.target.value)} />
        <FormInput label="Email professionnel *" id="email" icon="email" type="email" placeholder="contact@agence.mg"
          value={data.email} onChange={e => onChange('email', e.target.value)} />
        <FormInput label="Téléphone *" id="telephone" icon="phone" type="tel" placeholder="+261 34 XX XXX XX"
          value={data.telephone} onChange={e => onChange('telephone', e.target.value)} />
        <div className="sm:col-span-2">
          <FormInput label="Adresse physique de l'agence *" id="adresse" icon="home_pin"
            placeholder="Lot II, Rue de la Gare, Antananarivo"
            value={data.adresse} onChange={e => onChange('adresse', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <FormInput label="Site web (optionnel)" id="site" icon="language" placeholder="https://www.agence.mg"
            value={data.site} onChange={e => onChange('site', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack}
          className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <button onClick={onNext} disabled={!valid}
          className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          Suivant <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

// ─── STEP 2 : Documents ───────────────────────────────────────────────────
function Step2({ data, onChange, onNext, onBack }) {
  const valid = data.kbis && data.attestation
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">
          Documents justificatifs
        </h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          Joignez les pièces requises pour la validation de votre dossier.
        </p>
      </div>

      {[
        { key: 'kbis', label: 'Registre de Commerce / Kbis', icon: 'description', required: true },
        { key: 'attestation', label: 'Attestation de transport (MTPM)', icon: 'verified_user', required: true },
        { key: 'assurance', label: 'Police d\'assurance flotte', icon: 'shield', required: false },
      ].map(doc => (
        <div key={doc.key} className="flex items-center gap-4 rounded-lg border-2 border-dashed border-[#ECECEC] p-4 hover:border-[#E8433D] transition-all cursor-pointer group">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F7F7F8] border border-[#ECECEC] text-[#8A8A92] group-hover:text-[#E8433D] group-hover:border-[#E8433D] transition-all">
            <span className="material-symbols-outlined">{data[doc.key] ? 'check_circle' : doc.icon}</span>
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-[#1A1A1E] uppercase tracking-wide">
              {doc.label}
              {doc.required && <span className="text-[#E8433D] ml-1">*</span>}
            </p>
            <p className="font-body text-xs text-[#8A8A92] mt-0.5">
              {data[doc.key] ? `✓ ${data[doc.key].name || 'Fichier sélectionné'}` : 'PDF, JPG ou PNG — max 5 Mo'}
            </p>
          </div>
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => e.target.files[0] && onChange(doc.key, e.target.files[0])} />
            <span className={`font-display text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded border-2 transition-all
              ${data[doc.key] ? 'border-[#1A1A1E] text-[#1A1A1E]' : 'border-[#E8433D] text-[#E8433D] hover:bg-[#E8433D]/10'}`}>
              {data[doc.key] ? 'Modifier' : 'Joindre'}
            </span>
          </label>
        </div>
      ))}

      <div className="rounded-lg bg-[#F7F7F8] border border-[#ECECEC] p-4">
        <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92] mb-1">
          <span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>
          Note importante
        </p>
        <p className="font-body text-xs text-[#8A8A92]">
          Votre dossier sera examiné par l'équipe MadaLogistix dans un délai de 2 à 5 jours ouvrés.
          Vous recevrez une notification par email à l'adresse renseignée.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack}
          className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <button onClick={onNext} disabled={!valid}
          className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          Suivant <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

// ─── STEP 3 : Récapitulatif + Soumission ──────────────────────────────────
function Step3({ data, onSubmit, onBack }) {
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!consent) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit()
    } catch (err) {
      setError(err.message || 'Erreur lors de la soumission')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">
          Récapitulatif du dossier
        </h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          Vérifiez vos informations avant la soumission finale.
        </p>
      </div>

      {/* Summary rows */}
      {[
        { label: 'Raison sociale', value: data.raisonSociale },
        { label: 'NIF', value: data.nif },
        { label: 'Email', value: data.email },
        { label: 'Téléphone', value: data.telephone },
        { label: 'Adresse', value: data.adresse },
        { label: 'KBIS', value: data.kbis?.name || '—' },
        { label: 'Attestation', value: data.attestation?.name || '—' },
        { label: 'Assurance', value: data.assurance?.name || '—' },
      ].map(row => (
        <div key={row.label} className="flex items-start justify-between py-2 border-b border-[#ECECEC] last:border-0">
          <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92]">{row.label}</span>
          <span className="font-body text-sm font-medium text-[#1A1A1E] text-right max-w-[60%]">{row.value || '—'}</span>
        </div>
      ))}

      {/* Consent */}
      <label className="flex items-start gap-3 cursor-pointer pt-2">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#ECECEC] text-[#E8433D] focus:ring-[#E8433D] focus:ring-offset-0" />
        <span className="font-body text-xs text-[#8A8A92] leading-relaxed">
          J'atteste que les informations fournies sont exactes et j'accepte les{' '}
          <a href="#" className="text-[#E8433D] font-bold hover:underline">Conditions Générales d'Utilisation</a>{' '}
          de la plateforme MadaLogistix.
        </span>
      </label>

      {error && (
        <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3">
          <p className="font-body text-sm text-[#E8433D]">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack}
          className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <button onClick={handleSubmit} disabled={!consent || loading}
          className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <span className="animate-spin material-symbols-outlined text-[18px]">hourglass_empty</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">send</span>
          )}
          Soumettre le dossier
        </button>
      </div>
    </div>
  )
}

// ─── ATTENTE DE VALIDATION ────────────────────────────────────────────────
function AttenteValidation({ data, reference, onBack, onCheckStatus }) {
  const [checking, setChecking] = useState(false)
  const [statusResult, setStatusResult] = useState(null)
  const [checkError, setCheckError] = useState(null)

  const handleCheck = async () => {
    if (!reference) return
    setChecking(true)
    setCheckError(null)
    try {
      const result = await onCheckStatus()
      setStatusResult(result)
    } catch (err) {
      setCheckError(err.message || 'Impossible de vérifier le statut')
    } finally {
      setChecking(false)
    }
  }

  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Animated stamp */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#E8433D]/10 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="h-40 w-40 rounded-full border-4 border-dashed border-[#E8433D] flex items-center justify-center rotate-[-8deg] relative z-10 bg-white shadow-lg">
            <div className="text-center">
              <span className="material-symbols-outlined text-[36px] text-[#E8433D]">schedule</span>
              <p className="font-stamp text-[10px] uppercase font-bold text-[#E8433D] leading-tight mt-1">EN COURS<br />D'EXAMEN</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Dossier soumis avec succès
          </h1>
          <p className="font-body text-base text-[#8A8A92] max-w-md">
            Votre demande d'inscription pour <strong className="text-[#1A1A1E]">{data.raisonSociale}</strong> est en cours d'examen par l'équipe MadaLogistix.
          </p>
          <div className="inline-flex items-center gap-2 rounded-lg border-2 border-[#ECECEC] bg-white px-4 py-2">
            <span className="font-display text-[11px] uppercase tracking-wider text-[#8A8A92] font-bold">Référence dossier</span>
            <span className="font-stamp text-sm font-bold text-[#E8433D]">{reference || `#AGC-${Date.now().toString(36).slice(-6).toUpperCase()}`}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="w-full max-w-md rounded-xl border-2 border-[#ECECEC] bg-white p-6 text-left space-y-4">
          <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92]">Étapes de validation</p>
          {[
            { icon: 'check_circle', label: 'Dossier reçu & enregistré', done: true },
            { icon: 'manage_search', label: 'Examen des documents (2-5 jours ouvrés)', done: false, active: true },
            { icon: 'mark_email_read', label: 'Notification par email', done: false },
            { icon: 'key', label: 'Activation du compte administrateur', done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-[22px] ${step.done ? 'text-[#1A1A1E]' : step.active ? 'text-[#E8433D] animate-pulse' : 'text-[#ECECEC]'}`}>
                {step.icon}
              </span>
              <span className={`font-body text-sm ${step.done ? 'text-[#1A1A1E] font-semibold' : step.active ? 'text-[#E8433D] font-semibold' : 'text-[#8A8A92]'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Check status result */}
        {statusResult && (
          <div className="w-full max-w-md rounded-lg border-2 border-[#1A1A1E]/20 bg-white p-4 text-left">
            <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92] mb-2">
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>
              Statut actuel
            </p>
            <p className="font-body text-sm font-bold" style={{ color: statusResult.statutDossier === 'VALIDEE' ? '#1A1A1E' : statusResult.statutDossier === 'REFUSEE' ? '#E8433D' : '#8A8A92' }}>
              {statusResult.statutDossier === 'VALIDEE' ? 'Dossier validé — vous pouvez créer votre compte' : statusResult.statutDossier === 'REFUSEE' ? 'Dossier refusé — voir les détails' : 'En cours d\'examen'}
            </p>
          </div>
        )}

        {checkError && (
          <div className="w-full max-w-md rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3">
            <p className="font-body text-sm text-[#E8433D]">{checkError}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2 w-full max-w-md">
          <button onClick={handleCheck} disabled={checking}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-[#E8433D] px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-[#E8433D] transition-all hover:bg-[#E8433D]/5 disabled:opacity-50">
            {checking ? (
              <span className="animate-spin material-symbols-outlined text-[18px]">hourglass_empty</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            )}
            Vérifier mon statut
          </button>
          <button onClick={onBack} className="font-display text-sm font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors underline underline-offset-4">
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </PageBg>
  )
}

// ─── NOTIFICATION ACCEPTÉ / REFUSÉ ────────────────────────────────────────
function NotificationResult({ status, data, motifRefus, onFinalize, onRetry, onBack }) {
  const accepted = status === 'accepted'
  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Stamp result */}
        <div className={`h-44 w-44 rounded-full border-4 border-solid flex items-center justify-center rotate-[-6deg] shadow-xl
          ${accepted ? 'border-[#1A1A1E] bg-white' : 'border-[#E8433D] bg-white'}`}>
          <div className="text-center">
            <span className={`material-symbols-outlined text-[44px] ${accepted ? 'text-[#1A1A1E]' : 'text-[#E8433D]'}`}>
              {accepted ? 'verified' : 'block'}
            </span>
            <p className={`font-stamp text-[11px] uppercase font-bold leading-tight mt-1 ${accepted ? 'text-[#1A1A1E]' : 'text-[#E8433D]'}`}>
              {accepted ? 'DOSSIER\nVALIDÉ' : 'DOSSIER\nREFUSÉ'}
            </p>
          </div>
        </div>

        {accepted ? (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <span className="stamp-badge stamp-badge-neutral font-stamp text-xs">NOTIFICATION OFFICIELLE</span>
            </div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
              Félicitations ! Votre agence est validée
            </h1>
            <p className="font-body text-base text-[#8A8A92] max-w-md">
              L'agence <strong className="text-[#1A1A1E]">{data.raisonSociale}</strong> a été acceptée sur la plateforme MadaLogistix.
              Créez maintenant le compte Administrateur pour accéder à votre espace.
            </p>
            <button onClick={onFinalize}
              className="inline-flex items-center gap-2 rounded bg-[#E8433D] px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98]">
              <span className="material-symbols-outlined text-[20px]">key</span>
              Créer mon compte Administrateur
            </button>
          </div>
        ) : (
          <div className="space-y-4 w-full max-w-md">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
              Dossier non retenu
            </h1>
            <p className="font-body text-base text-[#8A8A92]">
              Votre demande pour <strong className="text-[#1A1A1E]">{data.raisonSociale}</strong> n'a pas pu être validée.
            </p>
            {/* Refusal reason */}
            <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-4 text-left">
              <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-2">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">report</span>
                Motif de refus
              </p>
              <p className="font-body text-sm text-[#1A1A1E]">
                {motifRefus || 'Le dossier ne répond pas aux critères de validation. Veuillez corriger et resoumettre.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={onRetry}
                className="flex items-center justify-center gap-2 rounded bg-[#E8433D] px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823]">
                <span className="material-symbols-outlined text-[18px]">edit_document</span>
                Corriger et renvoyer le dossier
              </button>
              <button onClick={onBack}
                className="font-display text-sm font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors underline underline-offset-4">
                ← Retour à l'accueil
              </button>
            </div>
          </div>
        )}

        {accepted && (
          <button onClick={onBack} className="font-display text-sm font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors underline underline-offset-4">
            ← Retour à l'accueil
          </button>
        )}
      </div>
    </PageBg>
  )
}

// ─── FINALISATION — Création compte Admin ─────────────────────────────────
function FinalisationCompte({ data, onComplete, onBack }) {
  const [form, setForm] = useState({ prenom: '', nom: '', emailAdmin: data.email || '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [showC, setShowC] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const valid = form.prenom && form.nom && form.emailAdmin && form.password && form.password === form.confirm && form.password.length >= 8

  const handleSubmit = async () => {
    if (!valid) return
    setLoading(true)
    setError(null)
    try {
      await onComplete(form)
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
      setLoading(false)
    }
  }

  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 w-full">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#1A1A1E] px-4 py-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#1A1A1E]">verified</span>
            <span className="font-stamp text-xs font-bold uppercase tracking-widest text-[#1A1A1E]">AGENCE VALIDÉE</span>
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Création du compte<br />Administrateur
          </h1>
          <p className="font-body text-sm text-[#8A8A92] max-w-sm">
            Ce compte aura accès à l'espace de gestion de l'agence <strong className="text-[#1A1A1E]">{data.raisonSociale}</strong>.
          </p>
        </div>

        <div className="w-full rounded-xl border-2 border-[#ECECEC] bg-white shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
          <div className="flex items-center justify-between border-b border-[#ECECEC] px-6 py-4">
            <p className="font-display text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold">
              COMPTE ADMINISTRATEUR — {data.raisonSociale?.toUpperCase()}
            </p>
            <span className="license-plate-tag text-xs">ADMIN-AGC</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Prénom *" id="prenom" icon="person" placeholder="Rakoto"
                value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
              <FormInput label="Nom *" id="nom" icon="person" placeholder="Andrianaivo"
                value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
            </div>
            <FormInput label="Email de connexion *" id="emailAdmin" icon="email" type="email" placeholder="admin@agence.mg"
              value={form.emailAdmin} onChange={e => setForm({ ...form, emailAdmin: e.target.value })} />

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block font-display text-[11px] uppercase tracking-wider font-bold text-[#1A1A1E]">Mot de passe *</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">lock</span>
                <input type={show ? 'text' : 'password'} placeholder="Min. 8 caractères"
                  className="h-11 w-full rounded border-2 border-[#ECECEC] bg-white py-2.5 pl-11 pr-11 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8A92] hover:text-[#E8433D] transition-colors">
                  <span className="material-symbols-outlined text-xl">{show ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <label className="block font-display text-[11px] uppercase tracking-wider font-bold text-[#1A1A1E]">Confirmer le mot de passe *</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">lock_reset</span>
                <input type={showC ? 'text' : 'password'} placeholder="Répéter le mot de passe"
                  className={`h-11 w-full rounded border-2 bg-white py-2.5 pl-11 pr-11 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]
                    ${form.confirm && form.password !== form.confirm ? 'border-[#E8433D]' : 'border-[#ECECEC]'}`}
                  value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
                <button type="button" onClick={() => setShowC(!showC)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8A92] hover:text-[#E8433D] transition-colors">
                  <span className="material-symbols-outlined text-xl">{showC ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {form.confirm && form.password !== form.confirm && (
                <p className="font-body text-xs text-[#E8433D]">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3">
                <p className="font-body text-sm text-[#E8433D]">{error}</p>
              </div>
            )}

            <button onClick={handleSubmit} disabled={!valid || loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-3 rounded bg-[#E8433D] font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="animate-spin material-symbols-outlined text-[20px]">hourglass_empty</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
              )}
              Activer mon compte & accéder
            </button>
          </div>
        </div>

        <button onClick={onBack}
          className="font-display text-sm font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors underline underline-offset-4">
          ← Retour
        </button>
      </div>
    </PageBg>
  )
}

// ─── COMPTE ACTIVÉ ────────────────────────────────────────────────────────
function CompteActive({ raisonSociale, adminName, onAccess }) {
  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Success animation */}
        <div className="relative flex items-center justify-center">
          <div className="h-40 w-40 rounded-full border-4 border-solid border-[#1A1A1E] bg-white flex items-center justify-center shadow-xl">
            <div className="text-center">
              <span className="material-symbols-outlined text-[48px] text-[#1A1A1E]">domain_verification</span>
              <p className="font-stamp text-[10px] uppercase font-bold text-[#1A1A1E] leading-tight mt-1">COMPTE<br />ACTIVÉ</p>
            </div>
          </div>
          {/* decorative rings */}
          <div className="absolute h-52 w-52 rounded-full border-2 border-dashed border-[#ECECEC] animate-spin" style={{ animationDuration: '20s' }} />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Bienvenue, {adminName} !
          </h1>
          <p className="font-body text-base text-[#8A8A92] max-w-md">
            Votre espace administrateur pour l'agence <strong className="text-[#1A1A1E]">{raisonSociale}</strong> est prêt.
            Vous pouvez désormais gérer vos chauffeurs et suivre vos opérations.
          </p>
        </div>

        {/* Quick info chips */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { icon: 'local_shipping', label: 'Gestion flotte' },
            { icon: 'group', label: 'Chauffeurs' },
            { icon: 'route', label: 'Tournées RN7' },
            { icon: 'receipt_long', label: 'Bordereaux' },
          ].map(chip => (
            <div key={chip.label} className="flex items-center gap-2 rounded-full border-2 border-[#ECECEC] bg-white px-4 py-2">
              <span className="material-symbols-outlined text-[18px] text-[#E8433D]">{chip.icon}</span>
              <span className="font-display text-xs font-bold uppercase tracking-wide text-[#1A1A1E]">{chip.label}</span>
            </div>
          ))}
        </div>

        <button onClick={onAccess}
          className="flex items-center gap-3 rounded bg-[#E8433D] px-10 py-3.5 font-display text-base font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98]">
          <span className="material-symbols-outlined text-[22px]">login</span>
          Accéder à mon tableau de bord
        </button>
      </div>
    </PageBg>
  )
}

// ─── REPRISE DOSSIER ──────────────────────────────────────────────────────
function ReprendreDossier({ initialTenantId, onComplete }) {
  const [tenantId, setTenantId] = useState(initialTenantId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const stored = agencesService.recupererDossierEnCours()

  const handleCheck = async () => {
    if (!tenantId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await agencesService.statutDossier(tenantId.trim())
      onComplete(result)
    } catch (err) {
      setError(err.message || 'Dossier introuvable. Vérifiez votre identifiant.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#ECECEC] px-4 py-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#8A8A92]">find_in_page</span>
            <span className="font-stamp text-xs font-bold uppercase tracking-widest text-[#8A8A92]">SUIVI DE DOSSIER</span>
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Reprendre mon dossier
          </h1>
          <p className="font-body text-sm text-[#8A8A92]">
            Saisissez votre identifiant de dossier pour vérifier son statut et finaliser votre inscription.
          </p>
        </div>

        <div className="w-full rounded-xl border-2 border-[#ECECEC] bg-white shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
          <div className="p-6 space-y-4">
            <FormInput
              label="Identifiant du dossier (UUID) *"
              id="tenantId"
              icon="badge"
              placeholder="ex : 550e8400-e29b-41d4-a716-446655440000"
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
            />
            {stored && (
              <div className="rounded-lg bg-[#F7F7F8] border border-[#ECECEC] p-3 text-left">
                <p className="font-display text-[10px] uppercase tracking-wider text-[#8A8A92] font-bold mb-1">Dossier sauvegardé</p>
                <p className="font-body text-sm font-medium text-[#1A1A1E]">{stored.raisonSociale || '—'}</p>
                <p className="font-body text-xs text-[#8A8A92] mt-0.5">Réf: {stored.reference}</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-3">
                <p className="font-body text-sm text-[#E8433D]">{error}</p>
              </div>
            )}

            <button onClick={handleCheck} disabled={!tenantId.trim() || loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded bg-[#E8433D] font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="animate-spin material-symbols-outlined text-[20px]">hourglass_empty</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">search</span>
              )}
              Vérifier le statut
            </button>
          </div>
        </div>
      </div>
    </PageBg>
  )
}

// ─── ROOT FLOW ORCHESTRATOR ───────────────────────────────────────────────
const STEP_LABELS = ['Identité', 'Documents', 'Récapitulatif']
const TOTAL_STEPS = 3

function AgenceInscriptionFlow() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const goBack = () => navigate('/')

  // Récupérer tenantId depuis URL params (deep link) ou localStorage
  const urlParams = new URLSearchParams(window.location.search)
  const deepLinkTenantId = urlParams.get('tenantId')
  const storedDossier = agencesService.recupererDossierEnCours()

  const initialScreen = deepLinkTenantId
    ? 'reprendre'
    : (storedDossier ? 'reprendre' : 'form')

  const [screen, setScreen] = useState(initialScreen) // form | attente | accepted | refused | reprendre | finalisation | done
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    raisonSociale: '', nif: '', stat: '', email: '', telephone: '', site: '',
    adresse: '',
    kbis: null, attestation: null, assurance: null,
  })
  const [tenantId, setTenantId] = useState(deepLinkTenantId || storedDossier?.tenantId || null)
  const [reference, setReference] = useState(storedDossier?.reference || '')
  const [adminName, setAdminName] = useState('')
  const [motifRefus, setMotifRefus] = useState('')

  const handleChange = (key, val) => setData(prev => ({ ...prev, [key]: val }))
  const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  // Soumission du dossier (Step3 → API)
  const handleSubmitDossier = async () => {
    const result = await agencesService.deposerDossier(
      {
        raisonSociale: data.raisonSociale,
        nif: data.nif,
        stat: data.stat,
        email: data.email,
        telephone: data.telephone,
        adresse: data.adresse,
        site: data.site,
      },
      {
        kbis: data.kbis,
        attestation: data.attestation,
        assurance: data.assurance,
      }
    )
    setTenantId(result.tenantId)
    setReference(result.reference)
    setScreen('attente')
  }

  // Vérification du statut depuis l'écran attente
  const handleCheckStatus = async () => {
    if (!tenantId) throw new Error('Identifiant dossier non disponible')
    const result = await agencesService.statutDossier(tenantId)
    if (result.statutDossier === 'VALIDEE') {
      setScreen('accepted')
    } else if (result.statutDossier === 'REFUSEE') {
      setMotifRefus(result.motifRefus || '')
      setScreen('refused')
    }
    // Si EN_ATTENTE, reste sur l'écran attente
    return result
  }

  // Reprendre dossier depuis l'écran ReprendreDossier
  const handleReprendreComplete = (result) => {
    setTenantId(result.tenantId)
    setReference(`#AGC-${result.tenantId?.toString().substring(0, 8)?.toUpperCase() || '????????'}`)
    if (result.statutDossier === 'VALIDEE') {
      setData(prev => ({ ...prev, raisonSociale: result.nomEntreprise || prev.raisonSociale }))
      setScreen('accepted')
    } else if (result.statutDossier === 'REFUSEE') {
      setData(prev => ({ ...prev, raisonSociale: result.nomEntreprise || prev.raisonSociale }))
      setMotifRefus(result.motifRefus || '')
      setScreen('refused')
    } else {
      setData(prev => ({ ...prev, raisonSociale: result.nomEntreprise || prev.raisonSociale }))
      setScreen('attente')
    }
  }

  // Finalisation du compte admin (appel API + auto-login via AuthContext)
  const handleFinalizeCompte = async (admin) => {
    await agencesService.finaliserCompte({
      tenantId,
      prenom: admin.prenom,
      nom: admin.nom,
      emailAdmin: admin.emailAdmin,
      password: admin.password,
    })
    // Auto-login
    await login(admin.emailAdmin, admin.password)
    setAdminName(`${admin.prenom} ${admin.nom}`)
    agencesService.effacerDossierEnCours()
    setScreen('done')
  }

  // Header shared
  const Header = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <button onClick={screen === 'form' ? goBack : () => setScreen('form')}
          className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <span className="text-[#ECECEC]">|</span>
        <h1 className="font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E]">
          <span className="text-[#E8433D]">Mada</span>Logistix
        </h1>
      </div>
      <span className="font-stamp text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold">Inscription Agence</span>
    </div>
  )

  if (screen === 'reprendre') return <ReprendreDossier initialTenantId={deepLinkTenantId || storedDossier?.tenantId} onComplete={handleReprendreComplete} />
  if (screen === 'attente') return <AttenteValidation data={data} reference={reference} onBack={goBack} onCheckStatus={handleCheckStatus} />
  if (screen === 'accepted') return <NotificationResult status="accepted" data={data} onFinalize={() => setScreen('finalisation')} onRetry={() => { setScreen('form'); setStep(1) }} onBack={goBack} />
  if (screen === 'refused') return <NotificationResult status="refused" data={data} motifRefus={motifRefus} onRetry={() => { setScreen('form'); setStep(1) }} onBack={goBack} />
  if (screen === 'finalisation') return <FinalisationCompte data={data} onComplete={handleFinalizeCompte} onBack={() => setScreen('accepted')} />
  if (screen === 'done') return <CompteActive raisonSociale={data.raisonSociale} adminName={adminName} onAccess={() => navigate('/direction', { replace: true })} />

  // Multi-step form
  return (
    <PageBg>
      <Header />
      <WaybillCard refCode={`#AGC-DRAFT-2026`}>
        <StepBar current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />
        {step === 1 && <Step1 data={data} onChange={handleChange} onNext={nextStep} onBack={goBack} />}
        {step === 2 && <Step2 data={data} onChange={handleChange} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <Step3 data={data} onSubmit={handleSubmitDossier} onBack={prevStep} />}
      </WaybillCard>
    </PageBg>
  )
}

export default AgenceInscriptionFlow
