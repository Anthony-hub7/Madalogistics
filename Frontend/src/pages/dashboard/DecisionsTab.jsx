const executions = [
  { date: '12 Oct', type: 'VRP', typeClass: 'text-primary', justification: 'Optimisation itinéraire Antananarivo - 15% km économisés', gain: '1.2M Ar', validePar: 'Rakoto J.', initials: 'RJ' },
  { date: '11 Oct', type: 'Bin Packing', typeClass: 'text-tertiary', justification: 'Chargement Camion #402 - Capacité +20%', gain: '0.8M Ar', validePar: 'Lala M.', initials: 'LM' },
  { date: '10 Oct', type: 'Knapsack', typeClass: 'text-primary', justification: 'Priorisation haute valeur Hub Toamasina', gain: '0.6M Ar', validePar: 'Rakoto J.', initials: 'RJ' },
  { date: '09 Oct', type: 'VRP', typeClass: 'text-primary', justification: 'Regroupement livraisons dernier kilomètre - Tamatave', gain: '0.7M Ar', validePar: 'Lala M.', initials: 'LM' },
  { date: '08 Oct', type: 'Bin Packing', typeClass: 'text-tertiary', justification: 'Redimensionnement palettes zone sud', gain: '0.5M Ar', validePar: 'Rakoto J.', initials: 'RJ' },
]

function DecisionsTab({ period }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Carte bleue gains */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-primary-container p-6 text-on-primary-container shadow-sm">
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-label-md text-label-md font-bold uppercase opacity-80">Résumé de performance</span>
            </div>
            <h2 className="mb-2 font-headline-md text-headline-md">Montant total économisé</h2>
            <p className="mb-6 font-label-md text-label-md opacity-70">
              Grâce aux algorithmes de routage et de chargement — {period}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold leading-none">3.8M Ar</span>
              <svg className="h-12 w-24" viewBox="0 0 100 40">
                <path d="M0 35 Q 20 30, 40 25 T 80 10 T 100 5" fill="none" stroke="white" strokeWidth="3" />
              </svg>
            </div>
          </div>
          <div className="relative z-10 mt-12 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low\/30 p-4 backdrop-blur-sm">
              <span className="font-label-md text-label-md">Km évités</span>
              <span className="font-bold">1,240 km</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low\/30 p-4 backdrop-blur-sm">
              <span className="font-label-md text-label-md">CO2 réduit</span>
              <span className="font-bold">0.8 Tons</span>
            </div>
          </div>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-surface-container-low\/30 blur-3xl" />
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        </div>

        {/* Table exécutions */}
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-outline-variant p-5">
            <h3 className="font-headline-md text-headline-md text-on-surface">Dernières exécutions d'optimisation</h3>
            <button className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exporter
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Date</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Type</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Justification résumée</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Gain estimé</th>
                  <th className="px-5 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Validé par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {executions.map((ex) => (
                  <tr key={ex.date + ex.type} className="transition-colors hover:bg-surface-container-lowest">
                    <td className="px-5 py-4 font-label-md text-label-md text-on-surface">{ex.date}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded bg-surface-container-highest px-2 py-1 text-[11px] font-bold uppercase ${ex.typeClass}`}>
                        {ex.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-body-sm text-body-sm text-on-surface-variant">{ex.justification}</td>
                    <td className="px-5 py-4 font-label-md text-label-md font-bold text-secondary">{ex.gain}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-dim text-[10px] font-bold">
                          {ex.initials}
                        </div>
                        <span className="font-label-md text-label-md">{ex.validePar}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-5 py-3">
            <span className="font-label-md text-label-md text-on-surface-variant">Affichage de 1-5 sur 42 exécutions</span>
            <div className="flex gap-2">
              <button className="rounded border border-outline-variant p-1 transition-colors hover:bg-surface-container-lowest" disabled>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="rounded border border-outline-variant p-1 transition-colors hover:bg-surface-container-lowest">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-start gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary-container/30">
            <span className="material-symbols-outlined text-[32px] text-on-secondary-container">lightbulb</span>
          </div>
          <div>
            <h4 className="mb-2 font-headline-md text-headline-md text-on-surface">Insight: Amélioration potentielle</h4>
            <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
              L'algorithme suggère de différer les livraisons non-critiques vers le hub de Fianarantsoa pour un gain estimé de 150k Ar additionnel par semaine.
            </p>
            <button className="flex items-center gap-2 font-label-md text-label-md font-bold text-primary hover:underline">
              Analyser le scénario
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
        <div className="flex items-start gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container/20">
            <span className="material-symbols-outlined text-[32px] text-primary">history_edu</span>
          </div>
          <div>
            <h4 className="mb-2 font-headline-md text-headline-md text-on-surface">Historique d'audit</h4>
            <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
              Toutes les décisions de la semaine passée ont été auditées avec un taux de conformité de 100% aux objectifs de coûts.
            </p>
            <button className="flex items-center gap-2 font-label-md text-label-md font-bold text-primary hover:underline">
              Voir le rapport d'audit
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DecisionsTab
