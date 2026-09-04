import ParametresTarifairesTab from './ParametresTarifairesTab'

export default function ParametresTarifairesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Paramètres tarifaires</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Gérez les grilles tarifaires et le seuil de remplissage minimum.
        </p>
      </div>
      <ParametresTarifairesTab />
    </div>
  )
}
