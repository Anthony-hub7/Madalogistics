import DecisionsTab from './DecisionsTab'

function DecisionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Décisions</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Historique des exécutions d'algorithmes et gains réalisés.
        </p>
      </div>
      <DecisionsTab period="ce mois" />
    </div>
  )
}

export default DecisionsPage
