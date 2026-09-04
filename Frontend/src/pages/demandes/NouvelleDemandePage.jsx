import { useState } from 'react'

const agencies = [
  {
    id: 'ag-01',
    name: 'MadaExpress RN7 — Hub Antananarivo',
    zone: 'Antananarivo ➔ Antsirabe (Corridor RN7 Direct)',
    code: 'RN7-HUB-TANA',
    fiabilite: 98.4,
    delai: '24h Transit RN7',
    tarifLabel: '€€ (Groupage Standard)',
    tarifDesc: 'Rapport qualité/prix optimal',
    recommandee: true,
    departures: 'Départs quotidiens (06:00 / 14:00)',
    hubs: ['Tana Hub Analakely', 'Ambatolampy Relay', 'Antsirabe Terminal'],
  },
  {
    id: 'ag-02',
    name: 'TransCorridor RN7 — Terminal Antsirabe',
    zone: 'Antananarivo ➔ Ambatolampy ➔ Antsirabe',
    code: 'RN7-TERM-ANTS',
    fiabilite: 94.2,
    delai: '36h Transit Éco',
    tarifLabel: '€ (Tarif Économique)',
    tarifDesc: 'Économie maximale sur gros volumes',
    recommandee: false,
    departures: '3 départs par semaine (Lun/Mer/Ven)',
    hubs: ['Tana Dépôt Sud', 'Antsirabe Centre'],
  },
  {
    id: 'ag-03',
    name: 'ColisPlus Madagascar — Relay Ambatolampy',
    zone: 'Antananarivo ➔ Ambatolampy',
    code: 'RN7-REL-AMBAT',
    fiabilite: 96.0,
    delai: '18h Transit Régional',
    tarifLabel: '€€€ (Express Direct)',
    tarifDesc: 'Priorité absolue sur colis légers',
    recommandee: false,
    departures: 'Départs sur réservation',
    hubs: ['Tana Hub', 'Ambatolampy Relay'],
  },
]

function NouvelleDemandePage() {
  const [step, setStep] = useState(1) // 1: Choix agence, 2: Détails colis & expédition
  const [selectedAgencyId, setSelectedAgencyId] = useState('ag-01')
  const [form, setForm] = useState({
    depart: '',
    arrivee: '',
    description: '',
    poids: '',
    volume: '',
    assurance: false,
    express: false,
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const selectedAgency = agencies.find(a => a.id === selectedAgencyId) || agencies[0]

  return (
    <div className="space-y-6">
      
      {/* Header & Stepper Section */}
      <div className="border-b border-outline-variant/60 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="stamp-badge stamp-badge-red text-xs">PARCOURS EXPÉDITION CLIENT</span>
          <span className="font-mono text-xs text-on-surface-variant">CORRIDOR RN7</span>
        </div>
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-on-surface">
          Nouvelle Demande d'Expédition
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          Consultez et choisissez votre agence partenaire puis renseignez les détails de votre marchandise.
        </p>

        {/* Stepper Tabs */}
        <div className="mt-6 flex items-center gap-4 border-t border-outline-variant/40 pt-4">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded font-display text-xs uppercase tracking-wider font-bold transition-all ${
              step === 1
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-light text-on-surface-variant hover:bg-surface-high'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">1</span>
            <span>Étape 1 : Choisir une Agence ({agencies.length} dispo)</span>
          </button>

          <span className="text-on-surface-variant/40 font-mono">➔</span>

          <button
            onClick={() => selectedAgencyId && setStep(2)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded font-display text-xs uppercase tracking-wider font-bold transition-all ${
              step === 2
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-light text-on-surface-variant hover:bg-surface-high'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">2</span>
            <span>Étape 2 : Détails du Colis & Expédition</span>
          </button>
        </div>
      </div>

      {/* STEP 1: CHOICE OF AGENCY CARDS */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-light border border-outline-variant p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">domain</span>
              <div>
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-on-surface">Agences recommandées sur le Corridor RN7</h3>
                <p className="font-body text-xs text-on-surface-variant">Classées selon notre algorithme (Proximité, Fiabilité, Délais & Tarifs)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="license-plate-tag text-xs">TANA ➔ ANTSIRABE</span>
            </div>
          </div>

          {/* Cards Grid / Vertical List */}
          <div className="space-y-4">
            {agencies.map((agency) => {
              const isSelected = selectedAgencyId === agency.id
              return (
                <div
                  key={agency.id}
                  onClick={() => setSelectedAgencyId(agency.id)}
                  className={`waybill-card p-5 cursor-pointer transition-all duration-150 relative overflow-hidden ${
                    isSelected
                      ? 'border-2 border-primary bg-primary/5 shadow-md'
                      : 'border border-outline-variant hover:border-primary/60'
                  }`}
                >
                  {/* Top stamp & radio indicator */}
                  <div className="flex items-start justify-between gap-4 mb-4 border-b border-outline-variant/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-outline-variant'
                      }`}>
                        {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-lg font-bold text-on-surface">{agency.name}</h4>
                          <span className="font-mono text-xs font-semibold text-on-surface-variant">[{agency.code}]</span>
                        </div>
                        <p className="font-body text-xs text-on-surface-variant mt-0.5">{agency.zone}</p>
                      </div>
                    </div>

                    {agency.recommandee && (
                      <span className="stamp-badge stamp-badge-red text-xs flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-xs">star</span>
                        RECOMMANDÉE (SCORE OPTIMAL)
                      </span>
                    )}
                  </div>

                  {/* Indicator Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-display text-xs">
                    
                    {/* Indicator 1: Fiabilité */}
                    <div className="waybill-card p-3 bg-surface border border-outline-variant/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant font-bold uppercase tracking-wider">Fiabilité Historique</span>
                        <span className="font-bold text-primary font-mono text-sm">{agency.fiabilite}%</span>
                      </div>
                      {/* Mini-meter bar */}
                      <div className="w-full h-2 rounded bg-surface-light overflow-hidden border border-outline-variant/40">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${agency.fiabilite}%` }}
                        />
                      </div>
                      <p className="font-body text-[11px] text-on-surface-variant">Livraisons conformes à l'heure</p>
                    </div>

                    {/* Indicator 2: Délai Moyen */}
                    <div className="waybill-card p-3 bg-surface border border-outline-variant/60 space-y-1.5">
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider block">Délai Moyen Transit</span>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">schedule</span>
                        <span className="font-bold text-on-surface text-sm">{agency.delai}</span>
                      </div>
                      <p className="font-body text-[11px] text-on-surface-variant">{agency.departures}</p>
                    </div>

                    {/* Indicator 3: Niveau Tarifaire */}
                    <div className="waybill-card p-3 bg-surface border border-outline-variant/60 space-y-1.5">
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider block">Niveau Tarifaire</span>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">payments</span>
                        <span className="font-bold text-on-surface text-sm">{agency.tarifLabel}</span>
                      </div>
                      <p className="font-body text-[11px] text-on-surface-variant">{agency.tarifDesc}</p>
                    </div>
                  </div>

                  {/* Footer Hub List */}
                  <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs font-body text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold uppercase tracking-wider text-xs text-on-surface">Relais d'étape :</span>
                      <span>{agency.hubs.join(' ➔ ')}</span>
                    </div>
                    <span className="font-display font-bold text-primary text-xs uppercase tracking-wider">
                      {isSelected ? '✓ Agence sélectionnée' : 'Cliquer pour choisir'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action to proceed */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-3 rounded bg-primary px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-primary/90 active:scale-95"
            >
              <span>Continuer avec {selectedAgency.name.split('—')[0]}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SHIPMENT FORM DETAILS */}
      {step === 2 && (
        <div className="grid grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
          <div className="col-span-12 lg:col-span-8">
            <section className="waybill-card p-6">
              
              {/* Agency Selected Banner */}
              <div className="flex items-center justify-between bg-primary/10 border border-primary/30 p-3.5 rounded mb-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">verified</span>
                  <div>
                    <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">AGENCE SÉLECTIONNÉE (ÉTAPE 1)</p>
                    <p className="font-display text-sm font-bold text-on-surface">{selectedAgency.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="font-display text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                >
                  Changer d'agence ✎
                </button>
              </div>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-display text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                      Adresse de départ
                    </label>
                    <input
                      value={form.depart}
                      onChange={(e) => update('depart', e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded px-4 py-2.5 font-body text-sm focus:outline-none focus:border-primary transition-all"
                      placeholder="Rue, Ville, Madagascar (ex: Tana Hub Analakely)"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-display text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">flag</span>
                      Adresse d'arrivée
                    </label>
                    <input
                      value={form.arrivee}
                      onChange={(e) => update('arrivee', e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded px-4 py-2.5 font-body text-sm focus:outline-none focus:border-primary transition-all"
                      placeholder="Rue, Ville, Madagascar (ex: Antsirabe Terminal)"
                      type="text"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-display text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    Description du colis
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded px-4 py-2.5 font-body text-sm focus:outline-none focus:border-primary transition-all resize-none"
                    placeholder="Ex: Pièces détachées automobiles, matériel informatique fragile, etc..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-display text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">weight</span>
                      Poids (kg)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        value={form.poids}
                        onChange={(e) => update('poids', e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded px-4 py-2.5 pr-12 font-body text-sm focus:outline-none focus:border-primary transition-all"
                        placeholder="0.0"
                        step="0.1"
                        type="number"
                      />
                      <span className="absolute right-4 font-display text-xs font-bold text-on-surface-variant">KG</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-display text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">aspect_ratio</span>
                      Volume (m³)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        value={form.volume}
                        onChange={(e) => update('volume', e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded px-4 py-2.5 pr-12 font-body text-sm focus:outline-none focus:border-primary transition-all"
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                      />
                      <span className="absolute right-4 font-display text-xs font-bold text-on-surface-variant">M³</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-light rounded border border-outline-variant">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">Options prioritaires</span>
                    <span className="stamp-badge stamp-badge-red text-[10px]">INCLUSIONS RN7</span>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex-1 flex items-center gap-2 p-3 bg-surface border border-outline-variant rounded cursor-pointer hover:border-primary transition-colors">
                      <input
                        checked={form.assurance}
                        onChange={(e) => update('assurance', e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                        type="checkbox"
                      />
                      <span className="font-body text-xs font-semibold text-on-surface">Assurance Premium</span>
                    </label>
                    <label className="flex-1 flex items-center gap-2 p-3 bg-surface border border-outline-variant rounded cursor-pointer hover:border-primary transition-colors">
                      <input
                        checked={form.express}
                        onChange={(e) => update('express', e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                        type="checkbox"
                      />
                      <span className="font-body text-xs font-semibold text-on-surface">Livraison Express</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded border border-outline-variant font-display text-xs uppercase tracking-wider font-bold text-on-surface-variant hover:bg-surface-light"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Précédent
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-3 bg-primary text-white px-6 py-3 rounded font-display text-sm font-bold uppercase tracking-wider shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    <span>Envoyer le Bordereau d'Expédition</span>
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </form>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="waybill-card p-5 border-l-4 border-l-primary space-y-4">
              <h3 className="font-display text-base font-bold uppercase tracking-wide text-on-surface flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <span className="material-symbols-outlined text-primary">map</span>
                Aperçu Itinéraire RN7
              </h3>
              <div className="space-y-4 font-body text-xs">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  <div>
                    <span className="font-display text-[11px] font-bold uppercase text-on-surface-variant">Collecte</span>
                    <p className="font-bold text-on-surface">{form.depart || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary">flag</span>
                  <div>
                    <span className="font-display text-[11px] font-bold uppercase text-on-surface-variant">Destination</span>
                    <p className="font-bold text-on-surface">{form.arrivee || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="waybill-card p-5 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">Agence Traitante</h4>
              <p className="font-display text-sm font-bold text-on-surface">{selectedAgency.name}</p>
              <div className="flex items-center justify-between font-display text-xs">
                <span className="text-on-surface-variant">Fiabilité :</span>
                <span className="font-bold text-primary">{selectedAgency.fiabilite}%</span>
              </div>
              <div className="flex items-center justify-between font-display text-xs">
                <span className="text-on-surface-variant">Délai estimé :</span>
                <span className="font-bold text-on-surface">{selectedAgency.delai}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NouvelleDemandePage
