import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { profilService } from '../services/profilService'
import { usePreferences, setPreference } from '../utils/preferences'

const OPTIONS_NOTIFS = [
  {
    valeur: 'toutes',
    titre: 'Toutes les notifications',
    aide: 'Incidents vehicule, sacs annules et alertes de la cloche.',
  },
  {
    valeur: 'incidents',
    titre: 'Incidents vehicules uniquement',
    aide: 'Seules les pannes / incidents ouvrent la fenetre de mise hors service.',
  },
  {
    valeur: 'silencieuse',
    titre: 'Silencieuse',
    aide: 'La cloche reste a zero : rien nest affiche, les alertes restent enregistrees.',
  },
]

/**
 * Modale Parametres : onglet Securite (mot de passe) + onglet Notifications
 * (preferences de la cloche, persistees en localStorage).
 * props : open, initialTab ('securite'|'notifications'), onClose
 */
export default function ParametresModal({ open, initialTab = 'securite', onClose }) {
  const prefs = usePreferences()
  const [tab, setTab] = useState(initialTab)
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [succes, setSucces] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    if (open) setTab(initialTab || 'securite')
  }, [open, initialTab])

  useEffect(() => {
    if (!open) {
      setAncien(''); setNouveau(''); setConfirmation('')
      setSucces(null); setErreur(null)
    }
  }, [open])

  if (!open) return null

  const soumettreMotDePasse = async (e) => {
    e.preventDefault()
    setErreur(null)
    setSucces(null)
    if (nouveau.length < 8) {
      setErreur('Le nouveau mot de passe doit contenir au moins 8 caracteres.')
      return
    }
    if (nouveau !== confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }
    setSubmitting(true)
    try {
      await profilService.changerMotDePasse({ ancienMotDePasse: ancien, nouveauMotDePasse: nouveau })
      setSucces('Mot de passe modifie avec succes.')
      setAncien(''); setNouveau(''); setConfirmation('')
    } catch (err) {
      setErreur(err?.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setSubmitting(false)
    }
  }

  const onglets = [
    { cle: 'securite', label: 'Securite', icon: 'lock' },
    { cle: 'notifications', label: 'Notifications', icon: 'notifications' },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}>
      <div
        className="my-auto flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-6 pt-6 pb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">Parametres</h3>
          <button onClick={onClose} className="text-on-surface-variant transition-colors hover:text-primary" aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-outline-variant px-6 pt-3 pb-3">
          {onglets.map((o) => (
            <button
              key={o.cle}
              onClick={() => setTab(o.cle)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors ${
                tab === o.cle
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}>
              <span className="material-symbols-outlined text-[18px]">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'securite' && (
            <form onSubmit={soumettreMotDePasse} className="space-y-4">
              <div>
                <label className="font-label-sm font-bold uppercase text-on-surface-variant" htmlFor="ancien-mdp">
                  Ancien mot de passe
                </label>
                <input
                  id="ancien-mdp"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={ancien}
                  onChange={(e) => setAncien(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="font-label-sm font-bold uppercase text-on-surface-variant" htmlFor="nouveau-mdp">
                  Nouveau mot de passe
                </label>
                <input
                  id="nouveau-mdp"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={nouveau}
                  onChange={(e) => setNouveau(e.target.value)}
                  placeholder="8 caracteres minimum"
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="font-label-sm font-bold uppercase text-on-surface-variant" htmlFor="confirmation-mdp">
                  Confirmation
                </label>
                <input
                  id="confirmation-mdp"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary focus:outline-none" />
              </div>

              {succes && (
                <div className="flex items-start gap-2 rounded-lg border border-secondary/40 bg-secondary-container/20 px-3 py-2.5">
                  <span className="material-symbols-outlined text-secondary">check_circle</span>
                  <p className="font-body text-sm text-secondary">{succes}</p>
                </div>
              )}
              {erreur && (
                <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2.5">
                  <span className="material-symbols-outlined text-error">error</span>
                  <p className="font-body text-sm text-error">{erreur}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-lg bg-primary font-label-md text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">
                {submitting ? 'Enregistrement…' : 'Modifier le mot de passe'}
              </button>
            </form>
          )}

          {tab === 'notifications' && (
            <div className="space-y-3">
              <p className="font-body text-sm text-on-surface-variant">
                Choisissez ce que la cloche de notifications affiche.
              </p>
              {OPTIONS_NOTIFS.map((opt) => {
                const actif = prefs.notifs === opt.valeur
                return (
                  <button
                    key={opt.valeur}
                    type="button"
                    onClick={() => setPreference('notifs', opt.valeur)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      actif
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant hover:bg-surface-container-high'
                    }`}>
                    <span className={`material-symbols-outlined text-[20px] ${actif ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {actif ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <span>
                      <span className="block font-body text-sm font-bold text-on-surface">{opt.titre}</span>
                      <span className="mt-0.5 block font-body text-xs text-on-surface-variant">{opt.aide}</span>
                    </span>
                  </button>
                )
              })}
              <p className="font-body text-xs text-on-surface-variant">
                Preference enregistree sur cet appareil.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
