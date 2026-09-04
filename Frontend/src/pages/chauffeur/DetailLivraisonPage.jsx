import { useState } from 'react'
import ConfirmationLivraison from '../../components/ConfirmationLivraison'

const statusSteps = [
  { key: 'en_preparation', label: 'En préparation', icon: 'inventory_2', sub: '08:30' },
  { key: 'en_route', label: 'En route', icon: 'local_shipping', sub: 'À venir' },
  { key: 'arrive', label: 'Arrivé', icon: 'location_city', sub: 'Sur place' },
  { key: 'livre', label: 'Livré', icon: 'task_alt', sub: 'Finalisé' },
]

const statusIndex = {
  a_venir: 0,
  acceptee: 0,
  en_cours: 1,
  en_route: 1,
  arrive: 2,
  livree: 3,
}

const packages = [
  { id: 'PKG-001', name: 'Pièces mécaniques moteur', tag: 'Fragile', tagColor: 'text-tertiary bg-tertiary/10', qty: 2 },
  { id: 'PKG-002', name: 'Huiles industrielles 20L', tag: 'Liquide', tagColor: 'text-primary bg-primary/10', qty: 5 },
  { id: 'PKG-003', name: 'Équipement électrique', tag: 'Prioritaire', tagColor: 'text-secondary bg-secondary/10', qty: 1 },
]

function DetailLivraisonPage({ delivery, onBack, onStatusChange }) {
  const [confirming, setConfirming] = useState(false)
  const idx = statusIndex[delivery?.status || 'a_venir']

  const handleStepClick = (stepIdx) => {
    if (stepIdx <= idx) return
    const stepKey = statusSteps[stepIdx].key
    if (stepKey === 'livre') {
      setConfirming(true)
    } else {
      onStatusChange(delivery.id, stepKey)
    }
  }

  const activeDelivery = confirming ? delivery : null

  return (
    <>
      <div className="pb-32">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Destinataire</p>
              <h2 className="font-headline-md text-headline-md text-on-surface mt-1">{delivery.client}</h2>
              <div className="flex items-start gap-2 text-on-surface-variant mt-2">
                <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
                <p className="font-body-md text-body-md">{delivery.address}</p>
              </div>
            </div>
            <button className="bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 px-6 py-4 rounded-xl active:scale-95 transition-transform shadow-sm">
              <span className="material-symbols-outlined">directions_run</span>
              <span>Lancer la navigation</span>
            </button>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <h3 className="font-label-md text-label-md text-outline uppercase px-1">Progression de la livraison</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {statusSteps.map((step, i) => {
              const isCompleted = i < idx
              const isCurrent = i === idx

              return (
                <button
                  key={step.key}
                  onClick={() => handleStepClick(i)}
                  disabled={i <= idx && !isCurrent}
                  className={`group flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isCompleted
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : isCurrent
                      ? 'border-primary bg-primary-container/20 text-primary shadow-md ring-2 ring-primary/20'
                      : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline cursor-pointer'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${
                    isCompleted
                      ? 'bg-secondary text-on-secondary'
                      : isCurrent
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-outline group-active:bg-primary-container'
                  }`}>
                    <span className="material-symbols-outlined">
                      {isCompleted ? 'check_circle' : step.icon}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-label-md text-label-md font-bold">{step.label}</p>
                    <p className="font-body-sm text-body-sm">
                      {isCompleted ? 'Validé' : isCurrent ? 'En cours' : step.sub}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-label-md text-label-md text-outline uppercase">Résumé des colis (3)</h3>
            <span className="font-label-sm text-label-sm text-secondary font-bold">Poids total: 142kg</span>
          </div>
          <div className="space-y-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg flex-shrink-0">
                    <span className="material-symbols-outlined text-outline">package_2</span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md font-semibold">{pkg.name}</p>
                    <p className="font-label-sm text-label-sm text-outline">
                      ID: {pkg.id} <span className={`${pkg.tagColor} px-1.5 py-0.5 rounded ml-1`}>{pkg.tag}</span>
                    </p>
                  </div>
                </div>
                <span className="bg-secondary-container text-on-secondary-container font-label-sm px-2 py-1 rounded flex-shrink-0">{pkg.qty} Unités</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 h-48 rounded-xl overflow-hidden border border-outline-variant relative">
          <div className="w-full h-full bg-gradient-to-br from-primary-fixed-dim/20 via-surface-container-high to-secondary-fixed-dim/20 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-primary/30">map</span>
              <p className="font-label-sm text-label-sm text-outline mt-2">Carte interactive</p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-4">
            <div className="bg-surface-container-lowest/90 backdrop-blur-md p-3 rounded-lg flex items-center gap-3 w-full">
              <span className="material-symbols-outlined text-primary">my_location</span>
              <span className="font-label-md text-label-md text-on-surface">Position actuelle: Analakely - 1.2km de la destination</span>
            </div>
          </div>
        </section>
      </div>

      {activeDelivery && (
        <ConfirmationLivraison
          delivery={activeDelivery}
          onConfirm={() => {
            onStatusChange(delivery.id, 'livree')
            setConfirming(false)
            onBack()
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  )
}

export default DetailLivraisonPage
