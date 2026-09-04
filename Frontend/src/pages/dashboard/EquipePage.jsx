import EquipeTab from './EquipeTab'

function EquipePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Équipe</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Gestion des membres et des rôles de l'organisation.
        </p>
      </div>
      <EquipeTab />
    </div>
  )
}

export default EquipePage
