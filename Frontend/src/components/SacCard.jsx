import UrgencyBadge from './UrgencyBadge'

export default function SacCard({ sac, index, onLancerVrp, vrpLoading, showAffectationHint }) {
  const taux = sac.taux_remplissage ?? 0
  const tauxColor = taux >= 80 ? '#10B981'
    : taux >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600">inventory_2</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sac {index + 1}</h3>
            <p className="text-sm text-gray-500">{sac.nb_colis ?? 0} colis</p>
          </div>
        </div>
        <UrgencyBadge
          dateDepartCalculee={sac.date_depart_plafond}
          departForce={sac.depart_force}
          compact
        />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Remplissage</span>
          <span className="font-medium" style={{ color: tauxColor }}>
            {taux.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(taux, 100)}%`,
              backgroundColor: tauxColor,
            }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Date depart plafond</span>
          <span className="font-medium text-gray-700">{sac.date_depart_plafond}</span>
        </div>
        {sac.depart_force && (
          <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            <span className="material-symbols-outlined text-sm">warning</span>
            Depart force — sous seuil mais delai expire
          </div>
        )}
      </div>

      {showAffectationHint && !onLancerVrp && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          Affectez un chauffeur et un véhicule pour lancer le VRP
        </div>
      )}

      {onLancerVrp && (
        <button
          onClick={() => onLancerVrp(sac.sac_id)}
          disabled={vrpLoading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {vrpLoading ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              VRP en cours...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">route</span>
              Lancer VRP
            </>
          )}
        </button>
      )}
    </div>
  )
}
