import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chauffeursService } from '../../services/chauffeursService'

// ─── Static data ──────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const CATEGORIES_PERMIS = ['B', 'C', 'C+E', 'D', 'D+E', 'BE']
const TYPES_VEHICULE = [
  'Camion léger (< 3.5T)',
  'Camion porteur (3.5–19T)',
  'Semi-remorque (> 19T)',
  'Camion frigorifique',
  'Camionnette / Pick-up',
  'Moto-taxi (livraison légère)',
]

// ─── Shared UI ────────────────────────────────────────────────────────────────
function PageBg({ children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F7F7F8] flex flex-col items-center justify-start py-8 px-4">
      <div className="fixed inset-0 pointer-events-none z-0">
        <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="chf-grid" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#1A1A1E" strokeWidth="1" strokeDasharray="3 5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#chf-grid)" />
        </svg>
        {/* Truck silhouette watermark */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-[0.025] pointer-events-none">
          <span className="material-symbols-outlined text-[320px] text-[#1A1A1E]">local_shipping</span>
        </div>
        {/* Stamp bottom-right */}
        <div className="absolute bottom-8 right-8 hidden xl:flex opacity-[0.05] pointer-events-none select-none">
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-[#E8433D] flex items-center justify-center rotate-[10deg]">
            <span className="font-stamp text-[10px] uppercase font-bold text-center leading-tight text-[#E8433D]">CHAUFFEUR<br />RN7<br />★ MADA ★</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 w-full max-w-2xl">{children}</div>
    </div>
  )
}

function FormInput({ label, id, icon, hint, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-display text-[11px] uppercase tracking-wider font-bold text-[#1A1A1E]">{label}</label>
      <div className="relative">
        {icon && <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">{icon}</span>}
        <input id={id}
          className={`h-11 w-full rounded border-2 border-[#ECECEC] bg-white py-2.5 ${icon ? 'pl-11' : 'pl-4'} pr-4 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]`}
          {...props} />
      </div>
      {hint && <p className="font-body text-[11px] text-[#8A8A92]">{hint}</p>}
    </div>
  )
}

function FormSelect({ label, id, icon, children, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-display text-[11px] uppercase tracking-wider font-bold text-[#1A1A1E]">{label}</label>
      <div className="relative">
        {icon && <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92] pointer-events-none">{icon}</span>}
        <select id={id}
          className={`h-11 w-full appearance-none rounded border-2 border-[#ECECEC] bg-white py-2.5 ${icon ? 'pl-11' : 'pl-4'} pr-10 font-body text-sm text-[#1A1A1E] outline-none transition-all focus:border-[#E8433D]`}
          {...props}>
          {children}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">expand_more</span>
      </div>
    </div>
  )
}

function StepBar({ current, total, labels }) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between mb-3 gap-1">
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
                ${active ? 'text-[#E8433D]' : done ? 'text-[#1A1A1E]' : 'text-[#8A8A92]'}`}>{lbl}</span>
            </div>
          )
        })}
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#ECECEC] overflow-hidden">
        <div className="h-full bg-[#E8433D] rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }} />
      </div>
    </div>
  )
}

function WaybillCard({ children, refCode, subtitle }) {
  return (
    <div className="w-full rounded-xl border-2 border-[#ECECEC] bg-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
      <div className="flex items-center justify-between border-b border-[#ECECEC] px-6 pt-5 pb-4">
        <div>
          <p className="font-display text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold">
            {subtitle || 'BORDEREAU D\'INSCRIPTION — CHAUFFEUR'}
          </p>
          <p className="font-stamp text-xs text-[#E8433D] font-bold mt-0.5">{refCode}</p>
        </div>
        <span className="license-plate-tag text-xs">RN7-CHF</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── STEP 1 : Identité ────────────────────────────────────────────────────
function Step1({ data, onChange, onNext, onBack }) {
  const valid = data.prenom && data.nom && data.cin && data.telephone && data.email && data.motDePasse
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">Identité du chauffeur</h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">Renseignez vos informations personnelles.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Prénom *" id="prenom" icon="person" placeholder="Rakoto"
          value={data.prenom} onChange={e => onChange('prenom', e.target.value)} />
        <FormInput label="Nom *" id="nom" icon="person" placeholder="Andrianaivo"
          value={data.nom} onChange={e => onChange('nom', e.target.value)} />
        <div className="col-span-2">
          <FormInput label="Numéro CIN *" id="cin" icon="badge" placeholder="101 000 000 000"
            hint="Carte d'identité nationale malgache (12 chiffres)"
            value={data.cin} onChange={e => onChange('cin', e.target.value)} />
        </div>
        <FormInput label="Date de naissance" id="dob" icon="cake" type="date"
          value={data.dob} onChange={e => onChange('dob', e.target.value)} />
        <FormSelect label="Sexe" id="sexe" icon="wc"
          value={data.sexe} onChange={e => onChange('sexe', e.target.value)}>
          <option value="">—</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </FormSelect>
        <FormInput label="Téléphone *" id="telephone" icon="phone" type="tel" placeholder="+261 34 XX XXX XX"
          value={data.telephone} onChange={e => onChange('telephone', e.target.value)} />
        <FormInput label="Email *" id="email" icon="email" type="email" placeholder="rakoto@mail.mg"
          value={data.email} onChange={e => onChange('email', e.target.value)} />
        <div className="col-span-2">
          <FormInput label="Mot de passe *" id="motDePasse" icon="lock" type="password" placeholder="Min. 8 caractères"
            value={data.motDePasse} onChange={e => onChange('motDePasse', e.target.value)} />
        </div>
        <div className="col-span-2">
          <FormInput label="Adresse de résidence" id="adresse" icon="home_pin" placeholder="Lot I, Antananarivo"
            value={data.adresse} onChange={e => onChange('adresse', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack} className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <button onClick={onNext} disabled={!valid} className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          Suivant <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

// ─── STEP 2 : Permis & Expérience ─────────────────────────────────────────
function Step2({ data, onChange, onNext, onBack }) {
  const valid = data.permisNum && data.permisCategorie && data.permisExpiration
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">Permis & Expérience</h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">Renseignez vos qualifications de conduite.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <FormInput label="Numéro de permis *" id="permisNum" icon="id_card" placeholder="MG-000-000000"
            value={data.permisNum} onChange={e => onChange('permisNum', e.target.value)} />
        </div>

        {/* Catégorie permis */}
        <div className="col-span-2 space-y-1.5">
          <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#1A1A1E]">Catégorie(s) *</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES_PERMIS.map(cat => {
              const sel = (data.categories || []).includes(cat)
              return (
                <button key={cat} type="button"
                  onClick={() => {
                    const arr = data.categories || []
                    onChange('categories', sel ? arr.filter(x => x !== cat) : [...arr, cat])
                  }}
                  className={`rounded border-2 px-4 py-2 font-stamp text-sm font-bold tracking-wider transition-all
                    ${sel ? 'border-[#E8433D] bg-[#E8433D]/10 text-[#E8433D]' : 'border-[#ECECEC] text-[#8A8A92] hover:border-[#1A1A1E]'}`}>
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        <div className="col-span-1">
          <FormInput label="Permis catégorie principale *" id="permisCategorie" icon="local_police"
            placeholder="Ex: C+E"
            value={data.permisCategorie} onChange={e => onChange('permisCategorie', e.target.value)} />
        </div>
        <div className="col-span-1">
          <FormInput label="Expiration permis *" id="permisExpiration" icon="event_busy" type="date"
            value={data.permisExpiration} onChange={e => onChange('permisExpiration', e.target.value)} />
        </div>
        <div className="col-span-2">
          <FormInput label="Années d'expérience" id="experience" icon="timeline" type="number" min="0" max="50"
            placeholder="Ex: 8"
            value={data.experience} onChange={e => onChange('experience', e.target.value)} />
        </div>
      </div>

      {/* Permis scan */}
      <label className="flex items-center gap-4 rounded-lg border-2 border-dashed border-[#ECECEC] p-4 hover:border-[#E8433D] transition-all cursor-pointer group">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F7F7F8] border border-[#ECECEC] text-[#8A8A92] group-hover:text-[#E8433D] group-hover:border-[#E8433D] transition-all">
          <span className="material-symbols-outlined">{data.permisScan ? 'check_circle' : 'photo_camera'}</span>
        </div>
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-[#1A1A1E] uppercase tracking-wide">Scan / Photo du permis *</p>
          <p className="font-body text-xs text-[#8A8A92]">{data.permisScanName ? `✓ ${data.permisScanName}` : 'JPG, PNG ou PDF — recto-verso'}</p>
        </div>
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => {
            const file = e.target.files[0]
            if (file) {
              onChange('permisScan', file)
              onChange('permisScanName', file.name)
            }
          }} />
        <span className={`font-display text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded border-2 transition-all
          ${data.permisScan ? 'border-[#1A1A1E] text-[#1A1A1E]' : 'border-[#E8433D] text-[#E8433D] hover:bg-[#E8433D]/10'}`}>
          {data.permisScan ? 'Modifier' : 'Joindre'}
        </span>
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack} className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <button onClick={onNext} disabled={!valid} className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          Suivant <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

// ─── STEP 4 : Véhicule ────────────────────────────────────────────────────
function Step3({ data, onChange, onNext, onSubmit, onBack, submitting }) {
  const isFreelance = data.typeChauffeur === 'freelance'
  const hasVehicule = data.aVehiculeAssigne === true
  const noVehicule = data.aVehiculeAssigne === false

  // Freelance → forcer aVehiculeAssigne = true à l'entrée de cette étape
  useEffect(() => {
    if (isFreelance && data.aVehiculeAssigne !== true) {
      onChange('aVehiculeAssigne', true)
    }
  }, [isFreelance, data.aVehiculeAssigne, onChange])

  const valid = isFreelance
    ? (hasVehicule && data.immatriculation && data.typeVehicule)
    : (noVehicule || (hasVehicule && data.immatriculation && data.typeVehicule))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">Véhicule assigné</h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          {isFreelance
            ? "En tant que freelance, vous devez renseigner votre véhicule."
            : "Renseignez les caractéristiques de votre véhicule principal."}
        </p>
      </div>

      {/* ── Gate : avez-vous un véhicule ? (uniquement rattaché) ── */}
      {!isFreelance && (
        <div className="space-y-1.5" role="radiogroup" aria-label="Possédez-vous un véhicule assigné ?">
          <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#1A1A1E]">
            Possédez-vous ou avez-vous un véhicule assigné ?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              role="radio"
              aria-checked={hasVehicule}
              onClick={() => {
                onChange('aVehiculeAssigne', true)
              }}
              className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all text-left ${
                hasVehicule
                  ? 'border-[#E8433D] bg-[#E8433D]/5 ring-2 ring-[#E8433D]/20'
                  : 'border-[#ECECEC] bg-white hover:border-[#1A1A1E]'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                hasVehicule ? 'bg-[#E8433D] text-white' : 'bg-[#F7F7F8] text-[#1A1A1E]'
              }`}>
                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              </div>
              <div>
                <p className={`font-display text-sm font-bold uppercase tracking-wide ${hasVehicule ? 'text-[#E8433D]' : 'text-[#1A1A1E]'}`}>
                  Oui
                </p>
                <p className="font-body text-[11px] text-[#8A8A92]">J'ai un véhicule</p>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={noVehicule}
              onClick={() => {
                onChange('aVehiculeAssigne', false)
                onChange('immatriculation', '')
                onChange('typeVehicule', '')
                onChange('marque', '')
                onChange('annee', '')
                onChange('ptac', '')
                onChange('capacite', '')
              }}
              className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all text-left ${
                noVehicule
                  ? 'border-[#E8433D] bg-[#E8433D]/5 ring-2 ring-[#E8433D]/20'
                  : 'border-[#ECECEC] bg-white hover:border-[#1A1A1E]'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                noVehicule ? 'bg-[#E8433D] text-white' : 'bg-[#F7F7F8] text-[#1A1A1E]'
              }`}>
                <span className="material-symbols-outlined text-[20px]">do_not_disturb_on</span>
              </div>
              <div>
                <p className={`font-display text-sm font-bold uppercase tracking-wide ${noVehicule ? 'text-[#E8433D]' : 'text-[#1A1A1E]'}`}>
                  Non
                </p>
                <p className="font-body text-[11px] text-[#8A8A92]">Pas encore</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Pas encore de véhicule (rattaché uniquement) → message ── */}
      {!isFreelance && noVehicule && (
        <div className="rounded-lg border-2 border-[#E8433D]/20 bg-[#E8433D]/5 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-[#E8433D] mt-0.5">info</span>
          <div>
            <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-1">Aucun véhicule pour le moment</p>
            <p className="font-body text-xs text-[#1A1A1E]">
              Pas de souci — votre agence vous assignera un véhicule après validation de votre candidature.
            </p>
          </div>
        </div>
      )}

      {/* ── Formulaire véhicule (visible si Oui OU si freelance) ── */}
      {(hasVehicule || isFreelance) && (
        <>
          {/* Plate preview */}
          <div className="flex items-center gap-4 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] p-4">
            <div className="flex flex-col">
              <span className="font-display text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold mb-2">Plaque d'immatriculation</span>
              <span className="license-plate-tag text-xl tracking-[0.2em] min-w-[160px] justify-center">
                {data.immatriculation?.toUpperCase() || '— — — — —'}
              </span>
            </div>
            <div className="flex-1">
              <span className="font-display text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold block mb-2">Aperçu</span>
              <span className="material-symbols-outlined text-[40px] text-[#1A1A1E] opacity-30">local_shipping</span>
            </div>
          </div>

          <FormInput label="Immatriculation *" id="immat" icon="pin" placeholder="Ex: 1234 TAA"
            value={data.immatriculation} onChange={e => onChange('immatriculation', e.target.value.toUpperCase())} />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Type de véhicule *" id="typeVehicule" icon="local_shipping"
              value={data.typeVehicule} onChange={e => onChange('typeVehicule', e.target.value)}>
              <option value="">Sélectionner...</option>
              {TYPES_VEHICULE.map(t => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
            <FormInput label="Marque / Modèle" id="marque" icon="directions_car" placeholder="Ex: Mercedes Actros"
              value={data.marque} onChange={e => onChange('marque', e.target.value)} />
            <FormInput label="Année" id="annee" icon="event" type="number" placeholder="Ex: 2019" min="1990" max="2026"
              value={data.annee} onChange={e => onChange('annee', e.target.value)} />
            <FormInput label="PTAC (tonnes)" id="ptac" icon="monitor_weight" type="number" placeholder="Ex: 26" step="0.5"
              value={data.ptac} onChange={e => onChange('ptac', e.target.value)} />
          </div>

          <FormInput label="Capacité de chargement (m³)" id="capacite" icon="inventory_2"
            type="number" min="0" max="100" step="0.5" placeholder="Ex : 12.5"
            hint="Volume utile approximatif de votre véhicule"
            value={data.capacite} onChange={e => onChange('capacite', e.target.value)} />
        </>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack} className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        {isFreelance ? (
          <button onClick={onSubmit} disabled={!valid || submitting} className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined text-[18px]">send</span>
            Soumettre ma candidature
          </button>
        ) : (
          <button onClick={onNext} disabled={!valid} className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            Suivant <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── STEP 3 : Choix du Statut ──────────────────────────────────────────────
function Step4({ data, onChange, onNext, onBack }) {
  const valid = data.typeChauffeur

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">Choix du Statut</h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          Définissez votre mode de collaboration avec MadaLogistix.
        </p>
      </div>

      {/* Warning Box */}
      <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-[20px] text-[#E8433D] mt-0.5">warning</span>
        <div>
          <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-1">
            Attention : Choix définitif
          </p>
          <p className="font-body text-xs text-[#1A1A1E]">
            Le choix de votre statut est définitif. Une fois validé, vous ne pourrez plus le modifier sans contacter le support.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rattaché Card */}
        <button
          type="button"
          onClick={() => onChange('typeChauffeur', 'rattaché')}
          className={`flex flex-col text-left rounded-xl border-2 p-5 transition-all ${
            data.typeChauffeur === 'rattaché'
              ? 'border-[#E8433D] bg-[#E8433D]/5 ring-2 ring-[#E8433D]/20'
              : 'border-[#ECECEC] bg-white hover:border-[#1A1A1E]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              data.typeChauffeur === 'rattaché' ? 'bg-[#E8433D] text-white' : 'bg-[#F7F7F8] text-[#1A1A1E]'
            }`}>
              <span className="material-symbols-outlined text-[24px]">storefront</span>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
              data.typeChauffeur === 'rattaché' ? 'border-[#E8433D] bg-[#E8433D]' : 'border-[#ECECEC]'
            }`}>
              {data.typeChauffeur === 'rattaché' && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
            </div>
          </div>
          <h3 className={`font-display text-lg font-bold uppercase tracking-wide mb-2 ${
            data.typeChauffeur === 'rattaché' ? 'text-[#E8433D]' : 'text-[#1A1A1E]'
          }`}>
            Chauffeur Rattaché
          </h3>
          <p className="font-body text-sm text-[#8A8A92]">
            Vous travaillez exclusivement pour une agence de transport spécifique. L'agence valide votre compte et vous assigne vos missions directement.
          </p>
        </button>

        {/* Freelance Card */}
        <button
          type="button"
          onClick={() => onChange('typeChauffeur', 'freelance')}
          className={`flex flex-col text-left rounded-xl border-2 p-5 transition-all ${
            data.typeChauffeur === 'freelance'
              ? 'border-[#E8433D] bg-[#E8433D]/5 ring-2 ring-[#E8433D]/20'
              : 'border-[#ECECEC] bg-white hover:border-[#1A1A1E]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              data.typeChauffeur === 'freelance' ? 'bg-[#E8433D] text-white' : 'bg-[#F7F7F8] text-[#1A1A1E]'
            }`}>
              <span className="material-symbols-outlined text-[24px]">explore</span>
            </div>
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
              data.typeChauffeur === 'freelance' ? 'border-[#E8433D] bg-[#E8433D]' : 'border-[#ECECEC]'
            }`}>
              {data.typeChauffeur === 'freelance' && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
            </div>
          </div>
          <h3 className={`font-display text-lg font-bold uppercase tracking-wide mb-2 ${
            data.typeChauffeur === 'freelance' ? 'text-[#E8433D]' : 'text-[#1A1A1E]'
          }`}>
            Chauffeur Freelance
          </h3>
          <p className="font-body text-sm text-[#8A8A92]">
            Vous êtes indépendant. Vous recevez des propositions de missions provenant de toutes les agences de la plateforme et êtes libre de les accepter.
          </p>
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack} className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <button onClick={onNext} disabled={!valid} className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          Suivant <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

// ─── STEP 5 : Sélection de l'agence ──────────────────────────────────────
function Step5({ data, onChange, onSubmit, onBack, submitting }) {
  const [search, setSearch] = useState('')
  const [agences, setAgences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`${BASE_URL}/auth/public/agences`)
      .then(r => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`)
        return r.json()
      })
      .then(data => setAgences(data))
      .catch(e => setError(e.message || 'Impossible de charger les agences'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = agences.filter(a =>
    a.nom.toLowerCase().includes(search.toLowerCase()) || (a.adresse || '').toLowerCase().includes(search.toLowerCase())
  )
  const selected = agences.find(a => a.tenantId === data.agenceId)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#1A1A1E]">Rattachement à une agence</h2>
        <p className="font-body text-sm text-[#8A8A92] mt-1">
          Choisissez l'agence à laquelle vous souhaitez soumettre votre candidature.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[#8A8A92]">search</span>
        <input type="text" placeholder="Rechercher une agence par nom..."
          className="h-11 w-full rounded border-2 border-[#ECECEC] bg-white py-2.5 pl-11 pr-4 font-body text-sm text-[#1A1A1E] outline-none transition-all placeholder:text-[#8A8A92] focus:border-[#E8433D]"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-8 text-center">
          <div className="w-8 h-8 border-4 border-[#E8433D]/20 border-t-[#E8433D] rounded-full animate-spin mx-auto" />
          <p className="font-body text-sm text-[#8A8A92] mt-3">Chargement des agences...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-[#E8433D] mt-0.5">error</span>
          <p className="font-body text-xs text-[#1A1A1E]">{error}</p>
        </div>
      )}

      {/* Agency list */}
      {!loading && !error && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filtered.map(agc => {
            const isSel = data.agenceId === agc.tenantId
            return (
              <button key={agc.tenantId} type="button" onClick={() => { onChange('agenceId', agc.tenantId); onChange('agenceNom', agc.nom) }}
                className={`w-full text-left rounded-lg border-2 p-4 transition-all
                  ${isSel ? 'border-[#E8433D] bg-[#E8433D]/5' : 'border-[#ECECEC] bg-white hover:border-[#1A1A1E]'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-stamp text-sm font-bold
                      ${isSel ? 'bg-[#E8433D] text-white' : 'bg-[#F7F7F8] border border-[#ECECEC] text-[#8A8A92]'}`}>
                      {agc.nom.substring(0, 2)}
                    </div>
                    <div>
                      <p className={`font-display text-sm font-bold uppercase tracking-wide ${isSel ? 'text-[#E8433D]' : 'text-[#1A1A1E]'}`}>{agc.nom}</p>
                      {agc.telephone && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="material-symbols-outlined text-[13px] text-[#8A8A92]">phone</span>
                          <span className="font-body text-xs text-[#8A8A92]">{agc.telephone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {isSel && <span className="material-symbols-outlined text-[20px] text-[#E8433D]">check_circle</span>}
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[#8A8A92] font-body text-sm">
              Aucune agence trouvée pour "{search}"
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="rounded-lg border-2 border-[#1A1A1E] bg-[#F7F7F8] p-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-[#1A1A1E]">check_circle</span>
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[#1A1A1E]">Agence sélectionnée — </span>
            <span className="font-stamp text-sm font-bold text-[#E8433D]">{selected.nom}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onBack} className="flex items-center gap-2 rounded border-2 border-[#ECECEC] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1A1E] hover:border-[#1A1A1E] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
        </button>
        <button onClick={onSubmit} disabled={!data.agenceId || submitting} className="flex items-center gap-2 rounded bg-[#E8433D] px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="material-symbols-outlined text-[18px]">send</span>
          Soumettre ma candidature
        </button>
      </div>
    </div>
  )
}

// ─── ATTENTE DE VALIDATION ────────────────────────────────────────────────
function AttenteValidation({ data, onBack }) {
  const agenceName = data.agenceNom || 'votre agence'
  const ref = `#CHF-2026-${Math.floor(1000 + Math.random() * 9000)}`
  const isFreelance = data.typeChauffeur === 'freelance'

  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Animated stamp */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#E8433D]/10 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="h-40 w-40 rounded-full border-4 border-dashed border-[#1A1A1E] flex items-center justify-center rotate-[6deg] relative z-10 bg-white shadow-lg">
            <div className="text-center">
              <span className="material-symbols-outlined text-[36px] text-[#1A1A1E]">pending_actions</span>
              <p className="font-stamp text-[10px] uppercase font-bold text-[#1A1A1E] leading-tight mt-1">EN ATTENTE<br />{isFreelance ? 'PLATEFORME' : 'AGENCE'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Candidature soumise !
          </h1>
          <p className="font-body text-base text-[#8A8A92] max-w-md">
            {isFreelance ? (
              <>Votre dossier a été envoyé à la <strong className="text-[#1A1A1E]">Plateforme MadaLogistix</strong>. Nos administrateurs vont examiner votre profil freelance.</>
            ) : (
              <>Votre dossier a été envoyé à <strong className="text-[#1A1A1E]">{agenceName}</strong>. L'administrateur de l'agence va examiner votre candidature.</>
            )}
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border-2 border-[#ECECEC] bg-white px-4 py-2">
              <span className="font-display text-[11px] uppercase tracking-wider text-[#8A8A92] font-bold">Réf.</span>
              <span className="font-stamp text-sm font-bold text-[#E8433D]">{ref}</span>
            </div>
            {agenceName && <span className="license-plate-tag text-xs">{agenceName.toUpperCase()}</span>}
          </div>
        </div>

        {/* Timeline */}
        <div className="w-full max-w-md rounded-xl border-2 border-[#ECECEC] bg-white p-6 text-left space-y-4">
          <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92]">Étapes de validation</p>
          {[
            { icon: 'check_circle', label: `Candidature reçue par ${isFreelance ? 'la plateforme' : "l'agence"}`, done: true },
            { icon: 'manage_search', label: `Examen par ${isFreelance ? 'la plateforme' : agenceName || "l'agence"}`, done: false, active: true },
            { icon: 'mark_email_read', label: 'Notification de décision', done: false },
            { icon: 'directions_car', label: 'Activation & premières missions', done: false },
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

        {/* Info attente réelle */}
        <div className="w-full max-w-md rounded-lg bg-[#F7F7F8] border border-[#ECECEC] p-4 text-left">
          <p className="font-stamp text-[10px] uppercase tracking-wider text-[#8A8A92] font-bold mb-2">
            <span className="material-symbols-outlined text-[12px] align-middle mr-1">info</span>
            Information
          </p>
          <p className="font-body text-xs text-[#8A8A92]">
            {isFreelance
              ? "La plateforme MadaLogistix examinera votre profil sous 2 à 5 jours ouvrés."
              : `L'agence ${agenceName} examinera votre candidature sous 2 à 5 jours ouvrés.`}
            {' '}Vous recevrez une notification par email.
          </p>
        </div>

        <button onClick={onBack} className="font-display text-sm font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors underline underline-offset-4">
          ← Retour à l'accueil
        </button>
      </div>
    </PageBg>
  )
}

// ─── NOTIFICATION ACCEPTÉ / REFUSÉ ────────────────────────────────────────
function NotificationResult({ status, data, onWelcome, onRetry, onBack }) {
  const accepted = status === 'accepted'
  const agenceName = data.agenceNom || 'votre agence'
  const isFreelance = data.typeChauffeur === 'freelance'

  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 text-center">
        <div className={`h-44 w-44 rounded-full border-4 border-solid flex items-center justify-center ${accepted ? 'rotate-[-6deg]' : 'rotate-[6deg]'} shadow-xl
          ${accepted ? 'border-[#1A1A1E] bg-white' : 'border-[#E8433D] bg-white'}`}>
          <div className="text-center">
            <span className={`material-symbols-outlined text-[44px] ${accepted ? 'text-[#1A1A1E]' : 'text-[#E8433D]'}`}>
              {accepted ? 'how_to_reg' : 'person_cancel'}
            </span>
            <p className={`font-stamp text-[10px] uppercase font-bold leading-tight mt-1 ${accepted ? 'text-[#1A1A1E]' : 'text-[#E8433D]'}`}>
              {accepted ? 'CHAUFFEUR\nACCEPTÉ' : 'CANDIDATURE\nREFUSÉE'}
            </p>
          </div>
        </div>

        {accepted ? (
          <div className="space-y-4 w-full max-w-md">
            <div className="inline-flex items-center gap-2">
              <span className="stamp-badge stamp-badge-neutral font-stamp text-xs">DÉCISION {isFreelance ? 'PLATEFORME' : 'AGENCE'}</span>
            </div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
              Candidature acceptée !
            </h1>
            <p className="font-body text-base text-[#8A8A92]">
              {isFreelance ? (
                <>La <strong className="text-[#1A1A1E]">Plateforme MadaLogistix</strong> a validé votre profil Freelance. Bienvenue !</>
              ) : (
                <>L'agence <strong className="text-[#1A1A1E]">{agenceName}</strong> a accepté votre candidature. Bienvenue dans l'équipe !</>
              )}
            </p>
            <button onClick={onWelcome}
              className="w-full flex items-center justify-center gap-2 rounded bg-[#E8433D] px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98]">
              <span className="material-symbols-outlined text-[20px]">celebration</span>
              Découvrir mon espace chauffeur
            </button>
          </div>
        ) : (
          <div className="space-y-4 w-full max-w-md">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">Candidature non retenue</h1>
            <p className="font-body text-base text-[#8A8A92]">
              {isFreelance ? (
                <>La <strong className="text-[#1A1A1E]">Plateforme</strong> n'a pas validé votre profil Freelance pour le moment.</>
              ) : (
                <>L'agence <strong className="text-[#1A1A1E]">{agenceName}</strong> n'a pas retenu votre profil pour le moment.</>
              )}
            </p>
            <div className="rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-4 text-left">
              <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-2">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">report</span>
                Motif communiqué par {isFreelance ? 'la plateforme' : "l'agence"}
              </p>
              <p className="font-body text-sm text-[#1A1A1E]">
                {isFreelance ? (
                  "Vos documents d'assurance ne sont pas conformes pour opérer en tant que Freelance."
                ) : (
                  "Votre permis de conduire de catégorie C n'est pas suffisant pour les véhicules opérés par cette agence. Nous requérons un permis C+E minimum."
                )}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={onRetry}
                className="flex items-center justify-center gap-2 rounded bg-[#E8433D] px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823]">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Postuler dans une autre agence
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

// ─── BIENVENUE — COMPTE ACTIVÉ ────────────────────────────────────────────
function BienvenueScreen({ data, onAccess, onBack }) {
  const agenceName = data.agenceNom || 'votre agence'
  const isFreelance = data.typeChauffeur === 'freelance'

  return (
    <PageBg>
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Activation badge */}
        <div className="relative">
          <div className="h-44 w-44 rounded-full border-4 border-solid border-[#E8433D] bg-white flex items-center justify-center shadow-xl">
            <div className="text-center">
              <span className="material-symbols-outlined text-[52px] text-[#E8433D]">local_shipping</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#1A1A1E] rounded-full p-2 shadow-lg">
            <span className="material-symbols-outlined text-[24px] text-white">verified</span>
          </div>
          {/* Rotating dashes */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ECECEC] animate-spin" style={{ animationDuration: '15s' }} />
        </div>

        <div className="space-y-2">
          <span className="stamp-badge stamp-badge-red font-stamp text-xs">COMPTE ACTIVÉ</span>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Bienvenue,<br />{data.prenom} {data.nom} !
          </h1>
          <p className="font-body text-base text-[#8A8A92] max-w-md">
            {isFreelance ? (
              <>Vous êtes maintenant <strong className="text-[#1A1A1E]">Chauffeur Freelance</strong>.<br />Consultez les missions proposées par les agences de la plateforme.</>
            ) : (
              <>Vous êtes maintenant chauffeur enregistré chez <strong className="text-[#1A1A1E]">{agenceName}</strong>.<br />Vos premières missions seront assignées par l'agence.</>
            )}
          </p>
        </div>

        {/* Summary card */}
        <div className="w-full max-w-md rounded-xl border-2 border-[#ECECEC] bg-white p-5 text-left space-y-3">
          <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92]">Récapitulatif de votre profil</p>
          <div className="flex items-center gap-3 py-2 border-b border-[#ECECEC]">
            <span className="material-symbols-outlined text-[20px] text-[#8A8A92]">person</span>
            <span className="font-body text-sm font-medium text-[#1A1A1E]">{data.prenom} {data.nom}</span>
          </div>
          {isFreelance ? (
            <div className="flex items-center gap-3 py-2 border-b border-[#ECECEC]">
              <span className="material-symbols-outlined text-[20px] text-[#8A8A92]">explore</span>
              <span className="font-body text-sm font-medium text-[#1A1A1E]">Freelance</span>
              <span className="ml-auto font-stamp text-[10px] text-[#8A8A92]">MULTI-AGENCES</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2 border-b border-[#ECECEC]">
              <span className="material-symbols-outlined text-[20px] text-[#8A8A92]">business</span>
              <span className="font-body text-sm font-medium text-[#1A1A1E]">{agenceName}</span>
              <span className="ml-auto font-stamp text-[10px] text-[#8A8A92]">AGENCE</span>
            </div>
          )}
          {data.aVehiculeAssigne === false ? (
            <div className="flex items-center gap-3 py-2 border-b border-[#ECECEC]">
              <span className="material-symbols-outlined text-[20px] text-[#E8433D]">pending</span>
              <span className="font-body text-sm font-medium text-[#E8433D]">Véhicule à assigner par l'agence</span>
            </div>
          ) : data.immatriculation ? (
            <div className="flex items-center gap-3 py-2 border-b border-[#ECECEC]">
              <span className="material-symbols-outlined text-[20px] text-[#8A8A92]">local_shipping</span>
              <span className="license-plate-tag text-xs">{data.immatriculation}</span>
              {data.typeVehicule && <span className="font-body text-xs text-[#8A8A92]">{data.typeVehicule}</span>}
            </div>
          ) : null}
          {data.permisCategorie && (
            <div className="flex items-center gap-3 py-2">
              <span className="material-symbols-outlined text-[20px] text-[#8A8A92]">id_card</span>
              <span className="font-body text-sm text-[#8A8A92]">Permis {data.permisCategorie}</span>
              {data.experience && <span className="ml-auto font-display text-xs font-bold text-[#8A8A92]">{data.experience} ans d'exp.</span>}
            </div>
          )}
        </div>

        <button onClick={onAccess}
          className="flex items-center gap-3 rounded bg-[#E8433D] px-10 py-3.5 font-display text-base font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#B82823] active:scale-[0.98]">
          <span className="material-symbols-outlined text-[22px]">route</span>
          Voir mes missions
        </button>

        <button onClick={onBack} className="font-display text-sm font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors underline underline-offset-4">
          ← Retour à l'accueil
        </button>
      </div>
    </PageBg>
  )
}

// ─── ROOT FLOW ORCHESTRATOR ───────────────────────────────────────────────

function ChauffeurInscriptionFlow() {
  const navigate = useNavigate()
  const goBack = () => navigate('/')
  const goLogin = () => navigate('/')
  const [screen, setScreen] = useState('form') // form | attente | accepted | refused | bienvenue
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    prenom: '', nom: '', cin: '', dob: '', sexe: '', telephone: '', email: '', adresse: '', motDePasse: '',
    permisNum: '', permisCategorie: '', permisExpiration: '', categories: [], experience: '', permisScan: null, permisScanName: '',
    aVehiculeAssigne: null,
    immatriculation: '', typeVehicule: '', marque: '', annee: '', ptac: '', capacite: '',
    typeChauffeur: '', agenceId: '',
  })

  const isFreelance = data.typeChauffeur === 'freelance'
  const stepLabels = isFreelance
    ? ['Identité', 'Permis', 'Statut', 'Véhicule']
    : ['Identité', 'Permis', 'Statut', 'Véhicule', 'Agence']
  const totalSteps = stepLabels.length

  const handleChange = (key, val) => setData(prev => ({ ...prev, [key]: val }))
  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleSubmitDossier = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const dossier = {
        prenom: data.prenom,
        nom: data.nom,
        cin: data.cin,
        dateNaissance: data.dob || null,
        sexe: data.sexe || null,
        telephone: data.telephone,
        email: data.email,
        adresse: data.adresse || null,
        motDePasse: data.motDePasse,
        permisNumero: data.permisNum,
        permisCategorie: data.permisCategorie,
        permisCategories: (data.categories || []).join(','),
        permisExpiration: data.permisExpiration || null,
        experienceAnnees: data.experience ? parseInt(data.experience) : null,
        typeChauffeur: data.typeChauffeur === 'rattaché' ? 'RATTACHE' : 'FREELANCE',
        agenceId: data.agenceId || null,
        aVehiculeAssigne: data.aVehiculeAssigne === true,
        immatriculation: data.immatriculation || null,
        typeVehicule: data.typeVehicule || null,
        marqueModele: data.marque || null,
        annee: data.annee ? parseInt(data.annee) : null,
        ptacTonnes: data.ptac || null,
        capaciteVolumeM3: data.capacite || null,
      }
      await chauffeursService.deposerDossier(dossier, data.permisScan)
      setScreen('attente')
    } catch (err) {
      setSubmitError(err.message || 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

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
      <span className="font-stamp text-[10px] uppercase tracking-widest text-[#8A8A92] font-bold">Inscription Chauffeur</span>
    </div>
  )

  if (screen === 'attente') return <AttenteValidation data={data} onBack={goBack} />
  if (screen === 'accepted') return <NotificationResult status="accepted" data={data} onWelcome={() => setScreen('bienvenue')} onRetry={() => { setScreen('form'); setStep(3) }} onBack={goBack} />
  if (screen === 'refused') return <NotificationResult status="refused" data={data} onRetry={() => { setScreen('form'); setStep(3) }} onBack={goBack} />
  if (screen === 'bienvenue') return <BienvenueScreen data={data} onAccess={() => goLogin()} onBack={goBack} />

  return (
    <PageBg>
      <Header />
      <WaybillCard refCode="#CHF-DRAFT-2026" subtitle="BORDEREAU D'INSCRIPTION — CHAUFFEUR DE TRANSPORT">
        {submitError && (
          <div className="mb-4 rounded-lg border-2 border-[#E8433D]/30 bg-[#E8433D]/5 p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-[#E8433D] mt-0.5">error</span>
            <div>
              <p className="font-display text-[11px] uppercase tracking-wider font-bold text-[#E8433D] mb-1">Erreur de soumission</p>
              <p className="font-body text-xs text-[#1A1A1E]">{submitError}</p>
            </div>
          </div>
        )}
        <StepBar current={step} total={totalSteps} labels={stepLabels} />
        {step === 1 && <Step1 data={data} onChange={handleChange} onNext={nextStep} onBack={goBack} />}
        {step === 2 && <Step2 data={data} onChange={handleChange} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <Step4 data={data} onChange={handleChange} onNext={nextStep} onBack={prevStep} />}
        {step === 4 && <Step3 data={data} onChange={handleChange} onNext={nextStep} onSubmit={handleSubmitDossier} onBack={prevStep} submitting={submitting} />}
        {step === 5 && !isFreelance && <Step5 data={data} onChange={handleChange} onSubmit={handleSubmitDossier} onBack={prevStep} submitting={submitting} />}
      </WaybillCard>
    </PageBg>
  )
}

export default ChauffeurInscriptionFlow
