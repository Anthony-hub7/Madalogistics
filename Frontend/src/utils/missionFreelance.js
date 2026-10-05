/**
 * Libelle metier d'une mission freelance, en francais.
 * L'UI n'affiche jamais le statut brut du sac (CONSTITUE, AFFECTE...).
 *
 * @param {string} sacStatut - statut du sac (CONSTITUE | AFFECTE | EN_TRANSIT | LIVRE)
 * @param {string|null} chauffeurNom - chauffeur ayant accepte la mission
 * @returns {{label: string, cls: string}|null}
 */
export function missionFreelanceLabel(sacStatut, chauffeurNom = null) {
  switch (sacStatut) {
    case 'CONSTITUE':
      return { label: "En appel d'offres", cls: 'border-amber-400 bg-amber-50 text-amber-700' }
    case 'AFFECTE':
      return {
        label: chauffeurNom ? `Acceptée par ${chauffeurNom}` : 'Acceptée',
        cls: 'border-green-300 bg-green-50 text-green-700',
      }
    case 'EN_TRANSIT':
      return { label: 'En transit', cls: 'border-red-300 bg-red-50 text-red-700' }
    case 'LIVRE':
      return { label: 'Livrée', cls: 'border-blue-300 bg-blue-50 text-blue-700' }
    default:
      return null
  }
}
