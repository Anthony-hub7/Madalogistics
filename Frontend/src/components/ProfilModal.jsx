import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { profilService } from '../services/profilService'
import { useAuth } from '../hooks/useAuth'

const ROLE_LABELS = {
  GESTIONNAIRE: 'Responsable logistique',
  DIRECTION: 'Direction',
  CHAUFFEUR: 'Chauffeur',
  CLIENT_FINAL: 'Client',
  ADMIN_SAAS: 'Admin plateforme',
}

function Ligne({ label, valeur, mono }) {
  if (valeur === null || valeur === undefined || valeur === '') return null
  return (
    <div>
      <span className="block font-label-sm text-label-sm uppercase text-on-surface-variant">{label}</span>
      <p className={`mt-0.5 font-body text-sm text-on-surface ${mono ? 'font-mono' : ''}`}>{valeur}</p>
    </div>
  )
}

/**
 * Modale Profil (lecture seule) : identite, contact et bloc metier.
 * props : open, onClose, onOpenParametres(tab)
 */
export default function ProfilModal({ open, onClose, onOpenParametres }) {
  const { user } = useAuth()
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    profilService.me()
      .then((data) => { if (!cancelled) setProfil(data) })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Profil indisponible') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  const nom = profil?.nom || user?.name || 'Utilisateur'
  const email = profil?.email || user?.email || ''
  const role = profil?.role || user?.role || ''
  const initiales = nom.split(/\s+/).map((m) => m[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const estChauffeur = role === 'CHAUFFEUR'

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}>
      <div
        className="my-auto flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 font-display text-base font-bold text-primary">
              {initiales}
            </div>
            <div className="flex-1">
              <h3 className="font-headline-md text-headline-md text-on-surface">Mon profil</h3>
              <p className="font-body text-sm text-on-surface-variant">
                {ROLE_LABELS[role] || role || 'Compte'}
                {profil?.tenantNom ? ` · ${profil.tenantNom}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-on-surface-variant transition-colors hover:text-primary" aria-label="Fermer">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {loading && (
            <p className="font-body text-sm text-on-surface-variant">Chargement…</p>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2.5">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="font-body text-sm text-error">{error}</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4">
                <p className="mb-3 font-label-sm text-label-sm uppercase text-on-surface-variant">
                  Identite
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Ligne label="Nom complet" valeur={nom} />
                  <Ligne label="Email" valeur={email} mono />
                  <Ligne label="Role" valeur={ROLE_LABELS[role] || role} />
                  <Ligne label="Agence" valeur={profil?.tenantNom} />
                  <Ligne label="CIN" valeur={profil?.cin} mono />
                  <Ligne label="Date de naissance"
                    valeur={profil?.dateNaissance
                      ? new Date(profil.dateNaissance).toLocaleDateString('fr-FR')
                      : null} />
                  <Ligne label="Sexe" valeur={profil?.sexe === 'M' ? 'Homme' : profil?.sexe === 'F' ? 'Femme' : profil?.sexe} />
                  <Ligne label="Adresse" valeur={profil?.adresse} />
                </div>
              </div>

              {estChauffeur && (
                <div className="rounded-lg border border-outline-variant p-4">
                  <p className="mb-3 font-label-sm text-label-sm uppercase text-on-surface-variant">
                    Dossier chauffeur
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Ligne label="Telephone" valeur={profil?.telephone} mono />
                    <Ligne label="Type" valeur={profil?.typeChauffeur} />
                    <Ligne label="Statut du dossier" valeur={profil?.statutDossier} />
                    <Ligne label="Vehicule" valeur={profil?.immatriculation} mono />
                  </div>
                </div>
              )}

              {profil?.clientNom && (
                <div className="rounded-lg border border-outline-variant p-4">
                  <p className="mb-3 font-label-sm text-label-sm uppercase text-on-surface-variant">
                    Compte client
                  </p>
                  <Ligne label="Raison sociale / Nom" valeur={profil.clientNom} />
                </div>
              )}

              <p className="font-body text-xs text-on-surface-variant">
                Informations en lecture seule : contactez votre responsable pour toute correction.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-outline-variant bg-surface p-6 pt-4">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-lg border border-outline-variant font-label-md text-on-surface transition-colors hover:bg-surface-container-high">
            Fermer
          </button>
          {onOpenParametres && (
            <button
              onClick={() => onOpenParametres('securite')}
              className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-lg bg-primary font-label-md text-on-primary transition-all hover:opacity-90 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">key</span>
              Modifier mon mot de passe
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
