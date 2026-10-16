export default function CommandeRecap({ order, onViewDetail }) {
  if (!order) return null

  const colis = Array.isArray(order.colis) ? order.colis : []
  const nbColis = colis.length || order.nbColis || 0
  const totalPoids = colis.reduce((s, c) => s + (parseFloat(c.poidsKg) || 0), 0)
  const totalVolume = colis.reduce((s, c) => s + (parseFloat(c.volumeM3) || 0), 0)

  const rows = [
    { label: 'Client', value: order.clientNom || '—' },
    { label: 'Hub', value: order.hubNom || '—' },
    { label: 'Collecte', value: order.adresseCollecte || '—' },
    { label: 'Livraison', value: order.adresseLivraison || '—' },
    { label: 'Contenu', value: `${nbColis} colis · ${totalPoids} kg · ${totalVolume} m³` },
    ...(order.nomDestinataire ? [{
      label: 'Destinataire',
      value: `${order.nomDestinataire}${order.telDestinataire ? ` · ${order.telDestinataire}` : ''}`,
    }] : []),
    ...(order.dateSouhaitee ? [{
      label: 'Date souhaitée',
      value: `${order.dateSouhaitee}${order.creneau ? ` (${order.creneau})` : ''}`,
    }] : []),
  ]

  return (
    <div className="rounded border border-[#ECECEC] bg-[#F7F7F8] p-4 space-y-2">
      <div className="flex items-center justify-between border-b border-[#ECECEC] pb-2">
        <span className="font-mono text-[10px] uppercase text-[#8A8A92]">Récapitulatif commande</span>
        <span className="font-mono text-xs font-bold text-[#E8433D]">
          #{String(order.demandeId).slice(0, 8).toUpperCase()}
        </span>
      </div>

      <dl className="space-y-1.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-start justify-between gap-3">
            <dt className="font-mono text-[10px] uppercase text-[#8A8A92] shrink-0">{r.label}</dt>
            <dd className="font-body text-xs text-[#1A1A1E] text-right break-words max-w-[62%]">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between border-t border-[#ECECEC] pt-2">
        <span className="font-mono text-[10px] uppercase text-[#8A8A92]">Tarif</span>
        <span className="font-display text-sm font-bold text-[#E8433D]">
          {order.tarif ? `${new Intl.NumberFormat('fr-MG').format(order.tarif)} Ar` : '—'}
        </span>
      </div>

      {onViewDetail && (
        <button
          type="button"
          onClick={onViewDetail}
          className="w-full border border-[#ECECEC] bg-white rounded px-3 py-2 font-mono text-[11px] font-bold uppercase text-[#1A1A1E] hover:bg-[#F7F7F8] cursor-pointer">
          Voir le détail complet →
        </button>
      )}
    </div>
  )
}
