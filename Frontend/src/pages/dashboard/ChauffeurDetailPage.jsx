import { useState } from 'react'

const CHAUFFEUR_DATA = {
  id: 'CHF-0012',
  type: 'Rattaché',
  agence: 'TRANS MADA SARL',
  nom: 'Andrianaivo',
  prenom: 'Jean Rakoto',
  initiales: 'JR',
  cin: '101 05 000 123 456',
  dob: '12/05/1988',
  lieuNaissance: 'Antananarivo',
  telephone: '+261 34 12 345 67',
  email: 'jean.andrianaivo@transmada.mg',
  adresse: 'Lot II M 45 Bis, Ampanatoana Antananarivo 101',
  dateRecrutement: '12 Mars 2024',
  permis: {
    numero: 'MG-C-2015-02-123456',
    categories: ['C', 'C+E'],
    expiration: '12/05/2027',
    mentionSpeciale: 'Transport de marchandises dangereuses autorisé',
  },
  vehicule: {
    plaque: '1234 TAA',
    type: 'Semi-remorque > 19T',
    marque: 'Mercedes-Benz Actros 1845',
    annee: 2019,
    ptac: '26 T',
    capacitePoids: '18 T',
    capaciteVolume: '82 m³',
    assurance: 'ALLIANZ · Valide jusqu\'au 18/11/2026',
    vignette: 'RN7 · Corridor RN7 / Autorisation spéciale',
    couleur: 'Rouge & blanc',
  },
  statut: 'Actif',
  missionsTotal: 248,
  kmTotal: '186 420',
  note: 4.8,
  nbRetards: 4,
  nbIncidents: 1,
  tauxLivraison: '97.2%',
  derniereMission: {
    id: 'ML-9402',
    date: '31 Août 2026',
    trajet: 'Antananarivo → Antsirabe',
    client: 'Pharmacie Centrale',
    statut: 'Terminée',
  },
  historique: [
    { id: 'ML-9402', date: '31 Août 2026', trajet: 'Antananarivo → Antsirabe', client: 'Pharmacie Centrale', poids: '320 kg', statut: 'Terminée', km: '170 km', duree: '2h 45m' },
    { id: 'ML-9398', date: '30 Août 2026', trajet: 'Antsirabe → Antananarivo', client: 'Usine Textile Tsirabé', poids: '2.1 T', statut: 'Terminée', km: '172 km', duree: '2h 55m' },
    { id: 'ML-9395', date: '29 Août 2026', trajet: 'Tana → Ambatolampy → Tana', client: 'Multi-clients (groupage)', poids: '5.8 T', statut: 'Terminée', km: '142 km', duree: '3h 20m' },
    { id: 'ML-9391', date: '28 Août 2026', trajet: 'Antananarivo → Betafo', client: 'Dépôt Bâtiments BRC', poids: '8.4 T', statut: 'Terminée', km: '205 km', duree: '3h 40m' },
    { id: 'ML-9384', date: '27 Août 2026', trajet: 'Antsirabe → Antananarivo', client: 'AgriMarket Sud', poids: '4.2 T', statut: 'Terminée · Retard 20m', km: '168 km', duree: '3h 15m' },
    { id: 'ML-9377', date: '26 Août 2026', trajet: 'Tana → Antsirabe → Tana', client: 'Retail Group MAD', poids: '12.6 T', statut: 'Terminée', km: '340 km', duree: '6h 10m' },
  ],
}

export default function ChauffeurDetailPage({ onNavigate, id: _id }) {
  const c = CHAUFFEUR_DATA
  const [tab, setTab] = useState('general')

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => onNavigate && onNavigate('chauffeurs_rattaches')}
        className="inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-[#8A8A92] hover:text-[#1A1A1E] transition-colors">
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        Retour aux chauffeurs rattachés
      </button>

      {/* === Fiche Header Waybill style === */}
      <section className="rounded-xl border-2 border-[#ECECEC] bg-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8433D]" />
        <div className="flex items-center justify-between border-b-2 border-[#ECECEC] bg-[#F7F7F8] px-6 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="stamp-badge stamp-badge-neutral font-stamp text-[10px]">FICHE CHAUFFEUR · RATTACHÉ</span>
              <span className="font-mono text-[10px] text-[#8A8A92] font-bold uppercase tracking-widest">
                DOSSIER {c.id}
              </span>
            </div>
            <p className="font-stamp text-sm text-[#E8433D] font-bold">
              {c.agence.toUpperCase()} · RN7 ANTANANARIVO HUB
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="license-plate-tag text-sm tracking-[0.15em]">{c.vehicule.plaque}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-stamp font-bold tracking-wide border-2
              ${c.statut === 'Actif'
                ? 'bg-[#F7F7F8] text-[#1A1A1E] border-[#1A1A1E]'
                : c.statut === 'En pause'
                ? 'bg-[#F7F7F8] text-[#E8433D] border-[#E8433D]'
                : 'bg-[#F7F7F8] text-[#8A8A92] border-[#ECECEC]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${c.statut === 'Actif' ? 'bg-[#1A1A1E] animate-pulse' : c.statut === 'En pause' ? 'bg-[#E8433D]' : 'bg-[#8A8A92]'}`} />
              {c.statut.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Identity row */}
        <div className="p-6 flex flex-col gap-6 md:flex-row md:items-start">
          {/* Avatar & Identity */}
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-[#E8433D] text-white font-stamp text-2xl font-bold flex items-center justify-center border-4 border-[#E8433D]/20 shadow-md">
                {c.initiales}
              </div>
              <div className="absolute -bottom-2 -right-2 rounded-full border-4 border-white bg-[#1A1A1E] text-white px-2 py-0.5 font-stamp text-[10px] font-bold">
                {c.permis.categories[0]}
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-bold text-[#1A1A1E] uppercase tracking-tight">
                {c.prenom} {c.nom}
              </h1>
              <p className="font-stamp text-[11px] text-[#E8433D] font-bold uppercase tracking-wider">
                ★ CHAUFFEUR RATTACHÉ · {c.agence}
              </p>
              <p className="font-body text-sm text-[#8A8A92] mt-2">
                <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[#1A1A1E]">Embauché le : </span>
                {c.dateRecrutement}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {c.permis.categories.map(cat => (
                  <span key={cat} className="license-plate-tag text-[11px]">PERMIS {cat}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Key metrics */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 ml-auto md:ml-6">
            {[
              { l: 'Missions', v: c.missionsTotal, i: 'assignment_turned_in' },
              { l: 'KM Total', v: c.kmTotal, i: 'route' },
              { l: 'Note moyenne', v: c.note.toFixed(1), i: 'star' },
              { l: 'Livraison OK', v: c.tauxLivraison, i: 'verified' },
            ].map((m, i) => (
              <div key={i} className="rounded-xl border-2 border-[#ECECEC] bg-[#F7F7F8] p-3.5 text-center">
                <span className="material-symbols-outlined text-[20px] text-[#E8433D]">{m.i}</span>
                <p className="font-display text-2xl font-bold tabular-nums text-[#1A1A1E] mt-1 leading-none">{m.v}</p>
                <p className="font-display text-[10px] font-bold uppercase tracking-wider text-[#8A8A92] mt-1">{m.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-[#ECECEC] bg-[#F7F7F8] px-2 rounded-t-xl">
        {[
          { k: 'general', l: 'Identité & Permis', i: 'person' },
          { k: 'vehicule', l: 'Véhicule assigné', i: 'local_shipping' },
          { k: 'historique', l: 'Historique tournées', i: 'receipt_long' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`inline-flex items-center gap-2 px-4 py-3 font-display text-[12px] font-bold uppercase tracking-wider border-b-3 transition-all relative
              ${tab === t.k
                ? 'text-[#E8433D]'
                : 'text-[#8A8A92] hover:text-[#1A1A1E]'}`}>
            <span className="material-symbols-outlined text-[18px]">{t.i}</span>
            {t.l}
            {tab === t.k && <span className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-[#E8433D]" />}
          </button>
        ))}
      </div>

      {/* === TAB: Identité === */}
      {tab === 'general' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identité */}
          <div className="waybill-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#E8433D]">badge</span>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#1A1A1E]">Identité</h3>
            </div>
            <div className="space-y-3">
              {[
                { l: 'Nom complet', v: `${c.prenom} ${c.nom}` },
                { l: 'CIN', v: c.cin },
                { l: 'Date / Lieu de naissance', v: `${c.dob} · ${c.lieuNaissance}` },
                { l: 'Adresse', v: c.adresse },
                { l: 'Téléphone', v: c.telephone },
                { l: 'Email', v: c.email },
              ].map(row => (
                <div key={row.l} className="flex items-start justify-between py-2 border-b border-[#ECECEC] last:border-0">
                  <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8A8A92] min-w-[140px]">{row.l}</span>
                  <span className="font-body text-sm text-[#1A1A1E] text-right font-semibold">{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Permis */}
          <div className="waybill-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#E8433D]">local_police</span>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#1A1A1E]">Permis de conduire</h3>
            </div>
            <div className="rounded-xl border-2 border-[#1A1A1E] bg-[#F7F7F8] p-5 relative overflow-hidden">
              <div className="absolute top-3 right-3 opacity-[0.06]">
                <span className="material-symbols-outlined text-[80px] text-[#1A1A1E]">id_card</span>
              </div>
              <div className="space-y-3 relative z-10">
                {[
                  { l: 'N° Permis', v: c.permis.numero, mono: true },
                  { l: 'Catégories', v: c.permis.categories.join(' · '), highlight: true },
                  { l: 'Date d\'expiration', v: c.permis.expiration, warn: true },
                  { l: 'Mention spéciale', v: c.permis.mentionSpeciale },
                ].map(row => (
                  <div key={row.l} className="flex items-start justify-between py-1.5">
                    <span className="font-stamp text-[10px] uppercase tracking-widest font-bold text-[#8A8A92] min-w-[120px]">{row.l}</span>
                    <span className={`${row.mono ? 'font-mono' : 'font-body'} ${row.highlight ? 'font-stamp text-[#E8433D] font-bold' : 'font-semibold'} ${row.warn ? 'text-[#E8433D]' : 'text-[#1A1A1E]'} text-sm text-right`}>
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-[#ECECEC] bg-white py-2 font-display text-[11px] font-bold uppercase tracking-wider text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E] transition-all">
                <span className="material-symbols-outlined text-[16px]">download</span>
                Télécharger permis
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-[#E8433D] bg-white py-2 font-display text-[11px] font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 transition-all">
                <span className="material-symbols-outlined text-[16px]">upload</span>
                Mettre à jour
              </button>
            </div>
          </div>

          {/* Contrat */}
          <div className="waybill-card p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E8433D]">contract_edit</span>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#1A1A1E]">Contrat & statut rattaché</h3>
              </div>
              <span className="stamp-badge stamp-badge-red text-[10px]">CONTRAT CDI · SIGNÉ</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { l: 'Type contrat', v: 'CDI Rattaché' },
                { l: 'Début contrat', v: c.dateRecrutement },
                { l: 'Salaire mensuel', v: '1 250 000 Ar' },
                { l: 'Hub d\'affectation', v: 'Antananarivo (RN7)' },
              ].map(row => (
                <div key={row.l} className="rounded-xl border border-[#ECECEC] bg-[#F7F7F8] p-3">
                  <p className="font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">{row.l}</p>
                  <p className="font-body text-sm font-bold text-[#1A1A1E] mt-1">{row.v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === TAB: Véhicule === */}
      {tab === 'vehicule' && (
        <section className="space-y-6">
          <div className="waybill-card p-6">
            <div className="flex flex-col md:flex-row gap-6 md:items-start md:justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#E8433D] text-[28px]">local_shipping</span>
                  <div>
                    <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-[#1A1A1E]">{c.vehicule.marque}</h3>
                    <p className="font-stamp text-[11px] text-[#8A8A92] font-bold uppercase tracking-wider">
                      {c.vehicule.type} · ANNÉE {c.vehicule.annee}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border-4 border-[#1A1A1E] bg-[#F7F7F8] px-6 py-4 relative">
                  <p className="font-stamp text-[10px] uppercase tracking-[0.25em] text-[#8A8A92] text-center mb-1">
                    PLAQUE D'IMMATRICULATION
                  </p>
                  <p className="font-stamp text-3xl tracking-[0.25em] text-[#1A1A1E] font-bold tabular-nums">
                    {c.vehicule.plaque}
                  </p>
                </div>
              </div>
            </div>

            {/* Capacity gauge */}
            <div className="rounded-xl border-2 border-[#ECECEC] bg-[#F7F7F8] p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#8A8A92]">inventory</span>
                  <p className="font-display text-[12px] font-bold uppercase tracking-wider text-[#8A8A92]">
                    JAUGE DE CHARGEMENT — CAPACITÉ VÉHICULE
                  </p>
                </div>
                <span className="font-stamp text-sm font-bold text-[#E8433D]">{c.vehicule.capaciteVolume}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-[32px] text-[#8A8A92]">local_shipping</span>
                <div className="flex-1 h-9 rounded-lg bg-[#ECECEC] overflow-hidden border-2 border-[#ECECEC] relative">
                  <div className="h-full bg-[#E8433D] rounded transition-all duration-500 relative"
                    style={{ width: '80%' }}>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-stamp text-[12px] font-bold text-white">
                      80% UTILISÉ
                    </span>
                  </div>
                  {[25, 50, 75].map(t => (
                    <div key={t} className="absolute top-0 bottom-0 w-px bg-white/70" style={{ left: `${t}%` }} />
                  ))}
                </div>
                <span className="font-stamp text-[11px] text-[#8A8A92] font-bold w-20 text-right">
                  MAX<br/>{c.vehicule.capaciteVolume}
                </span>
              </div>
              <input type="range" min="0" max="100" value="80" readOnly
                className="w-full h-2 bg-[#ECECEC] rounded-full appearance-none cursor-pointer accent-[#E8433D]" />
            </div>

            {/* Caractéristiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: 'PTAC', v: c.vehicule.ptac, i: 'monitor_weight' },
                { l: 'Poids utile', v: c.vehicule.capacitePoids, i: 'scale' },
                { l: 'Volume', v: c.vehicule.capaciteVolume, i: 'warehouse' },
                { l: 'Couleur', v: c.vehicule.couleur, i: 'palette' },
                { l: 'Assurance', v: c.vehicule.assurance, i: 'shield' },
                { l: 'Vignette corridor', v: c.vehicule.vignette, i: 'confirmation_number' },
                { l: 'Marque / Modèle', v: c.vehicule.marque, i: 'directions_car' },
                { l: 'Année', v: String(c.vehicule.annee), i: 'event' },
              ].map((row, i) => (
                <div key={i} className="rounded-xl border-2 border-[#ECECEC] bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[18px] text-[#E8433D]">{row.i}</span>
                    <p className="font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">{row.l}</p>
                  </div>
                  <p className="font-body text-sm font-bold text-[#1A1A1E]">{row.v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === TAB: Historique === */}
      {tab === 'historique' && (
        <section className="space-y-6">
          {/* Dernière mission card */}
          <div className="waybill-card p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="stamp-badge stamp-badge-neutral text-[10px]">DERNIÈRE MISSION</span>
              <span className="license-plate-tag text-[10px]">{c.derniereMission.id}</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[#E8433D]" />
                  <div className="h-12 w-0.5 border-l-2 border-dashed border-[#ECECEC]" />
                  <div className="h-3 w-3 rounded-full border-2 border-[#1A1A1E] bg-white" />
                </div>
                <div>
                  <p className="font-stamp text-[10px] uppercase tracking-widest text-[#8A8A92]">
                    {c.derniereMission.date}
                  </p>
                  <p className="font-display text-lg font-bold uppercase tracking-wide text-[#1A1A1E]">
                    {c.derniereMission.trajet}
                  </p>
                  <p className="font-body text-sm text-[#8A8A92] mt-0.5">
                    Client : <strong className="text-[#1A1A1E]">{c.derniereMission.client}</strong>
                  </p>
                </div>
              </div>
              <span className="stamp-badge stamp-badge-neutral text-[11px] self-start md:self-center">
                {c.derniereMission.statut}
              </span>
            </div>
          </div>

          {/* Historique table */}
          <section className="overflow-hidden rounded-xl border-2 border-[#ECECEC] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b-2 border-[#ECECEC] bg-[#F7F7F8] px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E8433D]">receipt_long</span>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#1A1A1E]">
                  Historique des tournées · RN7
                </h3>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg border-2 border-[#ECECEC] bg-white px-4 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E] transition-all">
                <span className="material-symbols-outlined text-[16px]">download</span>
                Exporter CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[#ECECEC] bg-[#F7F7F8]">
                    <th className="px-6 py-3.5 font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">N° Bordereau</th>
                    <th className="px-6 py-3.5 font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">Date</th>
                    <th className="px-6 py-3.5 font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">Trajet RN7</th>
                    <th className="px-6 py-3.5 font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">Client</th>
                    <th className="px-6 py-3.5 font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">Charge</th>
                    <th className="px-6 py-3.5 font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">Durée · KM</th>
                    <th className="px-6 py-3.5 font-display text-[10px] uppercase tracking-widest font-bold text-[#8A8A92]">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECEC]/70">
                  {c.historique.map(m => (
                    <tr key={m.id} className="hover:bg-[#F7F7F8]/70 transition-colors">
                      <td className="px-6 py-4">
                        <span className="license-plate-tag text-[11px]">{m.id}</span>
                      </td>
                      <td className="px-6 py-4 font-body text-xs font-semibold text-[#1A1A1E]">{m.date}</td>
                      <td className="px-6 py-4 font-display text-sm font-bold uppercase tracking-wide text-[#1A1A1E]">{m.trajet}</td>
                      <td className="px-6 py-4 font-body text-xs font-semibold text-[#1A1A1E]">{m.client}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#F7F7F8] border border-[#ECECEC] px-2.5 py-1">
                          <span className="material-symbols-outlined text-[14px] text-[#8A8A92]">monitor_weight</span>
                          <span className="font-stamp text-[11px] font-bold text-[#1A1A1E]">{m.poids}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-body text-xs font-bold text-[#1A1A1E]">{m.duree}</p>
                        <p className="font-mono text-[10px] text-[#8A8A92] font-bold">{m.km}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`stamp-badge text-[10px] ${m.statut.includes('Retard') ? 'stamp-badge-red' : 'stamp-badge-neutral'}`}>
                          {m.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}
    </div>
  )
}
