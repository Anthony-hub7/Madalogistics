import { useEffect, useState } from 'react'
import { sacsService } from '../../services/sacsService'

const nf = (n, max = 2) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: max })

/**
 * Creation manuelle d'un sac : on choisit un hub, puis coche librement
 * parmi les colis libres DE CE HUB uniquement (GET /sacs/colis-libres?hubId).
 * Le backend re-verifie le hub, l'etat et l'absence de sac existant.
 */
export default function SacCreerModal({ hubs = [], hubInitial = '', onClose, onSaved }) {
  const [hubId, setHubId] = useState(hubInitial || '')
  const [colis, setColis] = useState([])
  const [selection, setSelection] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!hubId) {
      setColis([])
      setSelection(new Set())
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setSelection(new Set())
    sacsService.getColisLibres(hubId).then(
      (res) => {
        if (!cancelled) {
          setColis(Array.isArray(res) ? res : [])
          setLoading(false)
        }
      },
      (err) => {
        if (!cancelled) {
          setError(err?.body?.error || err?.message || 'Impossible de charger les colis du hub')
          setLoading(false)
        }
      }
    )
    return () => { cancelled = true }
  }, [hubId])

  const toggle = (colisId) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(colisId)) next.delete(colisId)
      else next.add(colisId)
      return next
    })
  }

  const toutSelectionner = () => setSelection(new Set(colis.map((c) => c.colisId)))
  const toutEffacer = () => setSelection(new Set())

  const choisis = colis.filter((c) => selection.has(c.colisId))
  const poidsTotal = choisis.reduce((s, c) => s + (Number(c.poidsKg) || 0), 0)
  const volumeTotal = choisis.reduce((s, c) => s + (Number(c.volumeM3) || 0), 0)

  const handleCreer = async () => {
    if (!hubId || selection.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await sacsService.creer({ hubId, colisIds: [...selection] })
      onSaved?.(res)
      onClose()
    } catch (err) {
      setError(err?.body?.error || err?.message || "Erreur lors de la création du sac")
    } finally {
      setSaving(false)
    }
  }

  const toutCoche = colis.length > 0 && selection.size === colis.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div
        className="flex w-full max-w-4xl flex-col rounded-2xl bg-surface shadow-xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-on-surface">
              <span className="material-symbols-outlined text-primary">create_new_folder</span>
              Créer un sac manuellement
            </h3>
            <p className="text-xs text-on-surface-variant">
              Choisissez un hub, puis cochez les colis libres de ce hub — aucun colis d'un autre hub n'est proposé.
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Sélecteur de hub */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Hub du sac
              </span>
              <select
                value={hubId}
                onChange={(e) => setHubId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body text-sm text-on-surface"
              >
                <option value="">— Choisir un hub —</option>
                {hubs.map((h) => (
                  <option key={h.hubId || h.id} value={h.hubId || h.id}>{h.nom}</option>
                ))}
              </select>
            </label>
            {hubId && (
              <div className="flex gap-2 self-end">
                <button
                  onClick={toutSelectionner}
                  disabled={loading || colis.length === 0 || toutCoche}
                  className="rounded border border-outline-variant px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 cursor-pointer"
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={toutEffacer}
                  disabled={loading || selection.size === 0}
                  className="rounded border border-outline-variant px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:border-error hover:text-error disabled:opacity-40 cursor-pointer"
                >
                  Effacer
                </button>
              </div>
            )}
          </div>

          {!hubId ? (
            <div className="rounded-lg border border-outline-variant bg-surface-light px-4 py-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline">location_on</span>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                Sélectionnez un hub pour voir ses colis libres.
              </p>
            </div>
          ) : loading ? (
            <div className="py-12 text-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 font-body text-sm text-on-surface-variant">Chargement des colis du hub…</p>
            </div>
          ) : colis.length === 0 ? (
            <div className="rounded-lg border border-outline-variant bg-surface-light px-4 py-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline">inventory_2</span>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                Aucun colis libre sur ce hub — tous les colis sont déjà groupés ou livrés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-outline-variant">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-light/60">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={toutCoche}
                        onChange={(e) => (e.target.checked ? toutSelectionner() : toutEffacer())}
                        className="cursor-pointer"
                        aria-label="Tout sélectionner"
                      />
                    </th>
                    <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Colis</th>
                    <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Poids</th>
                    <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Volume</th>
                    <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Catégorie</th>
                    <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Client</th>
                    <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">Date souhaitée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 bg-surface">
                  {colis.map((c) => {
                    const actif = selection.has(c.colisId)
                    return (
                      <tr
                        key={c.colisId}
                        onClick={() => toggle(c.colisId)}
                        className={`cursor-pointer transition-colors ${actif ? 'bg-primary/5' : 'hover:bg-surface-light/70'}`}
                      >
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={actif}
                            onChange={() => toggle(c.colisId)}
                            className="cursor-pointer"
                            aria-label={`Sélectionner le colis ${String(c.colisId).slice(0, 8)}`}
                          />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-on-surface">
                          {String(c.colisId).slice(0, 8)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-sm text-on-surface">{nf(c.poidsKg, 1)} kg</td>
                        <td className="px-4 py-2.5 font-mono text-sm text-on-surface">{nf(c.volumeM3)} m³</td>
                        <td className="px-4 py-2.5 font-body text-sm text-on-surface-variant">{c.categorie || '—'}</td>
                        <td className="px-4 py-2.5 font-body text-sm text-on-surface-variant">{c.clientNom || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-on-surface-variant">{c.dateSouhaitee || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-outline-variant px-6 py-4">
          <p className="font-body text-xs text-on-surface-variant">
            Sélection : <strong className="font-mono">{selection.size}</strong> colis
            {selection.size > 0 && (
              <>
                {' '}· <span className="font-mono">{nf(poidsTotal, 1)} kg</span>
                {' '}· <span className="font-mono">{nf(volumeTotal)} m³</span>
              </>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleCreer}
              disabled={loading || saving || !hubId || selection.size === 0}
              className="flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {saving && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />}
              Créer le sac
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
