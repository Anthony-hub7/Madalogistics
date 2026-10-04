import { useState } from 'react'
import { simulationService } from '../../services/simulationService'

const PARAMS_DEFAUT = {
  capacitePoidsKg: '1000',
  capaciteVolumeM3: '10',
  seuilRemplissage: '60',
}

const JEU_EXEMPLE = [
  { poidsKg: '120', volumeM3: '0.9' },
  { poidsKg: '350', volumeM3: '2.1' },
  { poidsKg: '80', volumeM3: '0.6' },
  { poidsKg: '420', volumeM3: '3.2' },
  { poidsKg: '95', volumeM3: '1.1' },
  { poidsKg: '260', volumeM3: '1.8' },
  { poidsKg: '150', volumeM3: '0.4' },
  { poidsKg: '310', volumeM3: '2.5' },
  { poidsKg: '70', volumeM3: '0.3' },
  { poidsKg: '200', volumeM3: '1.2' },
]

const ALGOS = [
  { key: 'BIN_PACKING', label: 'FFD Bin Packing', desc: 'Heuristique gloutonne, rapide — plusieurs sacs' },
  { key: 'KNAPSACK', label: 'Knapsack OR-Tools', desc: 'Résolution exacte — 1 sac optimal' },
]

const nf = (n, max = 2) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: max })

export default function SimulationPage() {
  const [colis, setColis] = useState(JEU_EXEMPLE.map((c) => ({ ...c })))
  const [params, setParams] = useState(PARAMS_DEFAUT)
  const [algo, setAlgo] = useState('BIN_PACKING')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [resultat, setResultat] = useState(null)

  const totaux = colis.reduce(
    (acc, c) => ({
      poids: acc.poids + (Number(c.poidsKg) > 0 ? Number(c.poidsKg) : 0),
      volume: acc.volume + (Number(c.volumeM3) > 0 ? Number(c.volumeM3) : 0),
    }),
    { poids: 0, volume: 0 }
  )

  const changerLigne = (index, champ, valeur) =>
    setColis((prev) => prev.map((c, i) => (i === index ? { ...c, [champ]: valeur } : c)))

  const ajouterLigne = () => setColis((prev) => [...prev, { poidsKg: '', volumeM3: '' }])
  const supprimerLigne = (index) => setColis((prev) => prev.filter((_, i) => i !== index))
  const chargerExemple = () => {
    setColis(JEU_EXEMPLE.map((c) => ({ ...c })))
    setResultat(null)
    setErreur(null)
  }
  const toutEffacer = () => {
    setColis([{ poidsKg: '', volumeM3: '' }])
    setResultat(null)
    setErreur(null)
  }

  const lancer = async () => {
    setErreur(null)
    setResultat(null)

    if (colis.length === 0) {
      setErreur('Au moins un colis est requis')
      return
    }
    const invalides = colis
      .map((c, i) => (!(Number(c.poidsKg) > 0) || !(Number(c.volumeM3) > 0) ? i + 1 : null))
      .filter((n) => n !== null)
    if (invalides.length > 0) {
      setErreur(`Colis ${invalides.join(', ')} : poids et volume doivent être > 0`)
      return
    }
    if (!(Number(params.capacitePoidsKg) > 0) || !(Number(params.capaciteVolumeM3) > 0)) {
      setErreur('Capacité du sac invalide : poids et volume doivent être > 0')
      return
    }

    setLoading(true)
    try {
      const res = await simulationService.grouper({
        colis: colis.map((c) => ({
          poidsKg: Number(c.poidsKg),
          volumeM3: Number(c.volumeM3),
        })),
        capacitePoidsKg: Number(params.capacitePoidsKg),
        capaciteVolumeM3: Number(params.capaciteVolumeM3),
        algo,
        seuilRemplissage: Number(params.seuilRemplissage),
      })
      setResultat(res)
    } catch (e) {
      setErreur(e.body?.error || e.message || 'Erreur de simulation')
    } finally {
      setLoading(false)
    }
  }

  const champNum = (cle, label, unite) => (
    <label key={cle} className="flex flex-col gap-1">
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label} <span className="font-body font-normal normal-case">({unite})</span>
      </span>
      <input
        type="number"
        min="0"
        step="any"
        value={params[cle]}
        onChange={(e) => setParams({ ...params, [cle]: e.target.value })}
        className="w-32 rounded border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none"
      />
    </label>
  )

  const sacs = resultat?.sacs || []
  const nonGroupes = resultat?.nonGroupes || []
  const groupes = resultat ? resultat.meta.nbColis - nonGroupes.length : 0

  return (
    <div className="space-y-6">
      <div className="border-b border-outline-variant/60 pb-5">
        <span className="font-stamp rounded bg-tertiary/10 px-2 py-0.5 text-xs uppercase text-tertiary border border-tertiary/30">
          Simulation
        </span>
        <h2 className="font-display mt-1 text-3xl font-bold uppercase tracking-tight text-on-surface">
          Simulation de groupage
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          Saisissez vos colis et la capacité envisagée — le calcul est 100 % algorithmique,
          aucune donnée n'est lue ni enregistrée en base.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded border border-tertiary/30 bg-tertiary/5 px-4 py-3">
        <span className="material-symbols-outlined text-tertiary">science</span>
        <p className="font-body text-sm text-on-surface-variant">
          <strong className="font-display uppercase tracking-wide">Mode simulation —</strong> aucun hub,
          aucune demande, aucun véhicule réel : les sacs et le véhicule correspondant sont produits
          par l'algorithme à partir de vos seules saisies.
        </p>
      </div>

      {erreur && (
        <div className="flex items-start gap-3 rounded border border-error/40 bg-error/10 px-4 py-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body text-sm text-error">{erreur}</p>
        </div>
      )}

      {/* 1. Saisie des colis */}
      <div className="waybill-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
              1. Saisie des colis
            </h3>
            <span className="font-mono text-xs text-on-surface-variant">({colis.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={chargerExemple}
              className="rounded border border-outline-variant px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:border-primary hover:text-primary cursor-pointer"
            >
              Jeu d'exemple
            </button>
            <button
              onClick={toutEffacer}
              className="rounded border border-outline-variant px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:border-error hover:text-error cursor-pointer"
            >
              Tout effacer
            </button>
            <button
              onClick={ajouterLigne}
              className="rounded border border-primary/40 bg-primary/5 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 cursor-pointer"
            >
              + Ajouter un colis
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant w-14">#</th>
                <th className="px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Poids (kg)</th>
                <th className="px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Volume (m³)</th>
                <th className="px-6 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {colis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">
                    Aucun colis — cliquez sur « Jeu d'exemple » ou ajoutez une ligne.
                  </td>
                </tr>
              ) : (
                colis.map((c, i) => (
                  <tr key={i} className="transition-colors hover:bg-surface-light/70">
                    <td className="px-6 py-2 font-mono text-xs text-on-surface-variant">{i + 1}</td>
                    <td className="px-6 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={c.poidsKg}
                        onChange={(e) => changerLigne(i, 'poidsKg', e.target.value)}
                        placeholder="0"
                        className="w-32 rounded border border-outline-variant bg-surface px-3 py-1.5 font-mono text-sm text-on-surface focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-6 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={c.volumeM3}
                        onChange={(e) => changerLigne(i, 'volumeM3', e.target.value)}
                        placeholder="0"
                        className="w-32 rounded border border-outline-variant bg-surface px-3 py-1.5 font-mono text-sm text-on-surface focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-6 py-2 text-right">
                      <button
                        onClick={() => supprimerLigne(i)}
                        className="text-outline hover:text-error cursor-pointer"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-6 border-t border-outline-variant bg-surface-light/60 px-6 py-3">
          <p className="font-body text-xs text-on-surface-variant">
            Poids total : <span className="font-mono font-bold text-on-surface">{nf(totaux.poids)} kg</span>
          </p>
          <p className="font-body text-xs text-on-surface-variant">
            Volume total : <span className="font-mono font-bold text-on-surface">{nf(totaux.volume)} m³</span>
          </p>
        </div>
      </div>

      {/* 2. Paramètres */}
      <div className="waybill-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          {champNum('capacitePoidsKg', 'Capacité du sac — poids', 'kg')}
          {champNum('capaciteVolumeM3', 'Capacité du sac — volume', 'm³')}
          {champNum('seuilRemplissage', 'Seuil de remplissage minimal', '%')}
          <div className="flex gap-2">
            {ALGOS.map((a) => (
              <button
                key={a.key}
                onClick={() => setAlgo(a.key)}
                title={a.desc}
                className={`rounded-lg border-2 px-4 py-2 text-left transition-all cursor-pointer ${
                  algo === a.key
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-outline-variant hover:border-primary/40'
                }`}
              >
                <p className="font-body text-sm font-semibold text-on-surface">{a.label}</p>
                <p className="font-body text-xs text-on-surface-variant">{a.desc}</p>
              </button>
            ))}
          </div>
          <button
            onClick={lancer}
            disabled={loading}
            className="flex items-center gap-2 rounded bg-primary px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="animate-spin h-4 w-4 rounded-full border-2 border-on-primary border-t-transparent" />
                Calcul…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                Lancer la simulation
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Résultats */}
      {resultat && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Sacs obtenus', value: nf(sacs.length, 0), icon: 'inventory_2' },
              { label: 'Colis groupés', value: `${groupes} / ${resultat.meta.nbColis}`, icon: 'check_circle' },
              { label: 'Non groupés', value: nf(nonGroupes.length, 0), icon: 'block' },
              { label: 'Durée de calcul', value: `${nf(resultat.meta.dureeCalculMs, 0)} ms`, icon: 'bolt' },
            ].map((c) => (
              <div key={c.label} className="waybill-card p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">{c.icon}</span>
                  <span className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {c.label}
                  </span>
                </div>
                <p className="font-display mt-1 text-2xl font-bold text-on-surface">{c.value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">local_shipping</span>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">
                Profil des sacs & véhicule requis
              </h3>
            </div>
            {sacs.length === 0 ? (
              <div className="waybill-card px-6 py-10 text-center font-body text-sm text-on-surface-variant">
                Aucun sac constitué — tous les colis dépassent la capacité saisie.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sacs.map((s) => (
                  <div key={s.numero} className="waybill-card p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                        Sac {s.numero}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          s.tauxRemplissage >= 80
                            ? 'bg-green-100 text-green-700'
                            : s.sousSeuil
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {s.tauxRemplissage} %
                      </span>
                    </div>

                    <dl className="mt-3 space-y-1.5">
                      <div className="flex justify-between font-body text-sm">
                        <dt className="text-on-surface-variant">Colis</dt>
                        <dd className="font-mono font-semibold text-on-surface">{s.nbColis}</dd>
                      </div>
                      <div className="flex justify-between font-body text-sm">
                        <dt className="text-on-surface-variant">Poids</dt>
                        <dd className="font-mono font-semibold text-on-surface">{nf(s.poidsKg)} kg</dd>
                      </div>
                      <div className="flex justify-between font-body text-sm">
                        <dt className="text-on-surface-variant">Volume</dt>
                        <dd className="font-mono font-semibold text-on-surface">{nf(s.volumeM3)} m³</dd>
                      </div>
                    </dl>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-outline-variant/60">
                      <div
                        className={`h-full rounded-full ${
                          s.sousSeuil ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(s.tauxRemplissage, 100)}%` }}
                      />
                    </div>
                    {s.sousSeuil && (
                      <p className="mt-1 font-body text-xs text-amber-700">
                        Sous le seuil de {resultat.meta.seuilRemplissage} % — à compléter ou fusionner.
                      </p>
                    )}

                    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="font-display text-[10px] font-bold uppercase tracking-widest text-primary">
                        Véhicule à choisir
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-on-surface">
                        ≥ {nf(s.vehiculeRequis.capacitePoidsKgMin)} kg · ≥ {nf(s.vehiculeRequis.capaciteVolumeM3Min)} m³
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-body text-sm text-on-surface">{s.vehiculeRequis.gabaritSuggere}</p>
                        {s.vehiculeRequis.horsGabarit && (
                          <span className="rounded bg-error/10 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase text-error">
                            hors gabarit
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 font-mono text-[10px] text-on-surface-variant">
                      colis n° {s.colis.map((i) => i + 1).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {nonGroupes.length > 0 && (
            <div className="waybill-card overflow-hidden">
              <div className="border-b border-outline-variant bg-surface-light px-6 py-3">
                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">
                  Colis non groupés ({nonGroupes.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-light/60">
                      <th className="px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Colis</th>
                      <th className="px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Poids</th>
                      <th className="px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Volume</th>
                      <th className="px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-surface">
                    {nonGroupes.map((n) => (
                      <tr key={n.indexColis}>
                        <td className="px-6 py-3 font-mono text-sm text-on-surface">n° {n.indexColis + 1}</td>
                        <td className="px-6 py-3 font-mono text-sm text-on-surface">{nf(n.poidsKg)} kg</td>
                        <td className="px-6 py-3 font-mono text-sm text-on-surface">{nf(n.volumeM3)} m³</td>
                        <td className="px-6 py-3 font-body text-sm text-on-surface-variant">{n.motif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="waybill-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-xs text-on-surface-variant">
                <strong className="font-display uppercase tracking-wide">Méthode —</strong> algorithme{' '}
                {resultat.meta.algo === 'KNAPSACK' ? 'Knapsack OR-Tools (exact)' : 'Bin Packing FFD (heuristique)'}{' '}
                exécuté sur vos {resultat.meta.nbColis} colis, capacité {nf(resultat.meta.capacitePoidsKg, 0)} kg /{' '}
                {nf(resultat.meta.capaciteVolumeM3, 0)} m³, seuil {resultat.meta.seuilRemplissage} % —
                calcul en {resultat.meta.dureeCalculMs} ms, sans accès à la base de données.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setResultat(null)}
                  className="rounded border border-outline-variant px-4 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:border-primary hover:text-primary cursor-pointer"
                >
                  Modifier la saisie
                </button>
                <button
                  onClick={() => {
                    setColis(JEU_EXEMPLE.map((c) => ({ ...c })))
                    setParams(PARAMS_DEFAUT)
                    setAlgo('BIN_PACKING')
                    setResultat(null)
                    setErreur(null)
                  }}
                  className="rounded border border-primary/40 bg-primary/5 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 cursor-pointer"
                >
                  Nouvelle simulation
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
