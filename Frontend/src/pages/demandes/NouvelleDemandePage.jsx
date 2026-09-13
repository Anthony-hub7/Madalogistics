import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const agencies = [
  {
    id: 'ag-01',
    name: 'MadaExpress RN7 — Hub Antananarivo',
    zone: 'Antananarivo ➔ Antsirabe (Corridor RN7 Direct)',
    code: 'RN7-HUB-TANA',
    fiabilite: 98.4,
    delai: '24h Transit RN7',
    tarifLabel: '€€ (Standard Groupage)',
    tarifDesc: 'Rapport qualité/prix optimal corridor',
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
    tarifDesc: 'Économie maximale sur gros volumes de fret',
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
    tarifLabel: '€€€ (Express Prioritaire)',
    tarifDesc: 'Priorité absolue sur colis légers',
    recommandee: false,
    departures: 'Départs sur réservation',
    hubs: ['Tana Hub', 'Ambatolampy Relay'],
  },
]

export default function NouvelleDemandePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Choix agence, 2: Détails marchandise
  const [selectedAgencyId, setSelectedAgencyId] = useState('ag-01')
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    depart: 'Tana Hub Analakely (Gare Soarano)',
    arrivee: 'Antsirabe Terminal RN7 (Zone Industrielle)',
    description: '',
    poids: '',
    volume: '',
    assurance: true,
    express: false,
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const selectedAgency = agencies.find(a => a.id === selectedAgencyId) || agencies[0]

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête de section */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-xs text-[#8A8A92]">BORDEREAU D'ENREGISTREMENT #AUT-2026-RN7</span>
        </div>
        <h1 className="font-display text-[25px] font-bold text-[#1A1A1E] leading-tight">
          Nouvelle expédition de fret
        </h1>
        <p className="font-body text-[13.5px] text-[#8A8A92] mt-1">
          Sélectionnez votre transporteur partenaire agréé puis dressez le descriptif de chargement.
        </p>
      </div>

      {/* Stepper textuel numéroté façon sous-registre */}
      <div className="flex items-center gap-6 border-b border-[#ECECEC] pb-3 text-xs font-display">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex items-baseline gap-2 pb-1 bg-transparent border-0 cursor-pointer ${
            step === 1
              ? 'text-[#1A1A1E] font-bold border-b-2 border-[#E8433D]'
              : 'text-[#8A8A92] hover:text-[#1A1A1E]'
          }`}
        >
          <span className="font-mono text-[11px] text-[#E8433D]">01.A</span>
          <span className="text-[13.5px] uppercase">Sélection de l'Agence ({agencies.length})</span>
        </button>

        <span className="text-[#8A8A92] font-mono">/</span>

        <button
          type="button"
          onClick={() => selectedAgencyId && setStep(2)}
          className={`flex items-baseline gap-2 pb-1 bg-transparent border-0 cursor-pointer ${
            step === 2
              ? 'text-[#1A1A1E] font-bold border-b-2 border-[#E8433D]'
              : 'text-[#8A8A92] hover:text-[#1A1A1E]'
          }`}
        >
          <span className="font-mono text-[11px] text-[#E8433D]">01.B</span>
          <span className="text-[13.5px] uppercase">Détails Marchandise & Bordereau</span>
        </button>
      </div>

      {submitted ? (
        <div className="bordereau-row p-8 space-y-4 text-center max-w-[650px] mx-auto my-8">
          <div className="stamp-ink stamp-ink-red text-xs mx-auto mb-2">
            BORDEREAU ENREGISTRÉ #CMD-2026-9540
          </div>
          <h3 className="font-display text-xl font-bold text-[#1A1A1E]">
            Votre demande d'expédition a été transmise au registre
          </h3>
          <p className="font-body text-xs text-[#8A8A92] leading-relaxed">
            L'agence <strong className="text-[#1A1A1E] font-display">{selectedAgency.name}</strong> examine actuellement la disponibilité de son créneau RN7.
            Votre code de suivi officiel est attribué.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => navigate('/client/mes_commandes')}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors"
            >
              Consulter dans Mes Expéditions
            </button>
          </div>
        </div>
      ) : step === 1 ? (
        /* ÉTAPE 1 : CHOIX DE L'AGENCE PARTENAIRE */
        <div className="space-y-4">
          <div className="space-y-3.5">
            {agencies.map((agency) => {
              const isSelected = selectedAgencyId === agency.id
              return (
                <div
                  key={agency.id}
                  onClick={() => setSelectedAgencyId(agency.id)}
                  className={`bordereau-row p-5 sm:p-6 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-[#E8433D] bg-white' : 'hover:border-[#1A1A1E]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ECECEC] pb-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-[#E8433D]">[{agency.code}]</span>
                        <h3 className="font-display text-lg font-bold text-[#1A1A1E]">{agency.name}</h3>
                      </div>
                      <p className="font-body text-xs text-[#8A8A92] mt-0.5">{agency.zone}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {agency.recommandee && (
                        <div className="stamp-ink stamp-ink-red text-[10px]">
                          AGENCE RECOMMANDÉE
                        </div>
                      )}
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-[#E8433D] bg-[#E8433D]' : 'border-[#ECECEC]'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>

                  {/* Métriques */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-[#F7F7F8] p-3 rounded border border-[#ECECEC]">
                      <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Fiabilité Corridor</span>
                      <span className="font-mono font-bold text-sm text-[#1A1A1E]">{agency.fiabilite}%</span>
                      <p className="font-body text-[11px] text-[#8A8A92] mt-0.5">Livraisons conformes à l'heure</p>
                    </div>
                    <div className="bg-[#F7F7F8] p-3 rounded border border-[#ECECEC]">
                      <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Délai Estimé RN7</span>
                      <span className="font-display font-bold text-sm text-[#1A1A1E]">{agency.delai}</span>
                      <p className="font-body text-[11px] text-[#8A8A92] mt-0.5">{agency.departures}</p>
                    </div>
                    <div className="bg-[#F7F7F8] p-3 rounded border border-[#ECECEC]">
                      <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Niveau Tarifaire</span>
                      <span className="font-display font-bold text-sm text-[#1A1A1E]">{agency.tarifLabel}</span>
                      <p className="font-body text-[11px] text-[#8A8A92] mt-0.5">{agency.tarifDesc}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#ECECEC] flex items-center justify-between text-xs font-mono text-[#8A8A92]">
                    <span>Relais d'étape : {agency.hubs.join(' ➔ ')}</span>
                    <span className="font-display font-semibold text-[#E8433D]">
                      {isSelected ? '✓ Agence cochée' : 'Cliquer pour choisir'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={() => setStep(2)}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm"
            >
              Étape suivante : Renseigner les colis ➔
            </button>
          </div>
        </div>
      ) : (
        /* ÉTAPE 2 : DÉTAILS DU COLIS & BORDEREAU */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="bordereau-row p-6 space-y-6">
              
              <div className="bg-[#F7F7F8] border border-[#ECECEC] p-3.5 rounded flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Transporteur Sélectionné</span>
                  <span className="font-display text-sm font-bold text-[#1A1A1E]">{selectedAgency.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-mono text-xs text-[#E8433D] hover:underline bg-transparent border-0 cursor-pointer"
                >
                  [ Modifier l'agence ]
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase font-bold text-[#1A1A1E] mb-1.5">
                    Hub ou Adresse de Départ
                  </label>
                  <input
                    type="text"
                    required
                    value={form.depart}
                    onChange={(e) => update('depart', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3.5 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase font-bold text-[#1A1A1E] mb-1.5">
                    Hub ou Adresse de Destination
                  </label>
                  <input
                    type="text"
                    required
                    value={form.arrivee}
                    onChange={(e) => update('arrivee', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3.5 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase font-bold text-[#1A1A1E] mb-1.5">
                  Désignation et Nature du Chargement
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: 8x Cartons fournitures industrielles, 2x Palettes textiles..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="w-full bg-white border border-[#ECECEC] rounded px-3.5 py-2 font-body text-xs focus:outline-none focus:border-[#1A1A1E]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase font-bold text-[#1A1A1E] mb-1.5">
                    Poids Brut Total (KG)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="Ex: 250"
                    value={form.poids}
                    onChange={(e) => update('poids', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3.5 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase font-bold text-[#1A1A1E] mb-1.5">
                    Volume Total Estimé (M³)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    placeholder="Ex: 1.20"
                    value={form.volume}
                    onChange={(e) => update('volume', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3.5 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]"
                  />
                </div>
              </div>

              <div className="bg-[#F7F7F8] p-4 rounded border border-[#ECECEC] space-y-2">
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase block font-bold">Options d'Affrètement</span>
                <div className="flex flex-col sm:flex-row gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-body text-xs">
                    <input
                      type="checkbox"
                      checked={form.assurance}
                      onChange={(e) => update('assurance', e.target.checked)}
                      className="rounded text-[#E8433D] focus:ring-[#E8433D]"
                    />
                    <span>Assurance Marchandise Déclarée (Ad Valorem)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-body text-xs">
                    <input
                      type="checkbox"
                      checked={form.express}
                      onChange={(e) => update('express', e.target.checked)}
                      className="rounded text-[#E8433D] focus:ring-[#E8433D]"
                    />
                    <span>Priorité Transit Direct RN7 Express</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer"
                >
                  ← Retour au choix agence
                </button>
                <button
                  type="submit"
                  className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm"
                >
                  Signer et Transmettre le Bordereau ➔
                </button>
              </div>
            </form>
          </div>

          {/* Volet récapitulatif officiel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bordereau-row p-5 space-y-3 font-body text-xs">
              <div className="border-b border-[#ECECEC] pb-2.5">
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Bordereau Récapitulatif</span>
                <span className="font-display font-bold text-sm text-[#1A1A1E]">Itinéraire Corridor RN7</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Départ :</span>
                  <span className="font-mono font-bold text-[#1A1A1E] text-xs">{form.depart || '—'}</span>
                </div>
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Arrivée :</span>
                  <span className="font-mono font-bold text-[#1A1A1E] text-xs">{form.arrivee || '—'}</span>
                </div>
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Agence :</span>
                  <span className="font-display font-semibold text-[#1A1A1E]">{selectedAgency.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
