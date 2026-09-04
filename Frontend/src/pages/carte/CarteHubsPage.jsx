import { useState, useEffect } from 'react'
import { MapContainer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import CachedTiles from '../../map/CachedTiles'

const STORAGE_KEY = 'madalogistix_hubs'

const DEFAULT_CENTER = [-18.914, 47.541]

const defaultHubs = [
  { id: 1, nom: 'Hub Antananarivo', adresse: 'Zone Industrielle, Ankorondrano', lat: -18.914, lng: 47.541, statut: 'actif' },
]

function safeCenter(hubs) {
  const hub = hubs.find(h => typeof h.lat === 'number' && typeof h.lng === 'number')
  return hub ? [hub.lat, hub.lng] : DEFAULT_CENTER
}

const hubIcon = L.divIcon({
  className: '',
    html: `<div style="background:#E8433D;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="color:white;font-size:18px">location_on</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) })
  return null
}

function CarteHubsPage() {
  const [hubs, setHubs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', adresse: '' })
  const [pendingLatLng, setPendingLatLng] = useState(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setHubs(stored ? JSON.parse(stored) : defaultHubs)
    } catch { setHubs(defaultHubs) }
  }, [])

  const save = (newHubs) => {
    setHubs(newHubs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHubs))
  }

  const handleMapClick = (latlng) => {
    if (showForm) {
      setPendingLatLng(latlng)
    }
  }

  const handleSave = () => {
    if (!form.nom.trim() || !pendingLatLng) return
    const newHub = {
      id: Date.now(),
      nom: form.nom,
      adresse: form.adresse || `${pendingLatLng.lat.toFixed(4)}, ${pendingLatLng.lng.toFixed(4)}`,
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      statut: 'actif',
    }
    save([...hubs, newHub])
    setForm({ nom: '', adresse: '' })
    setPendingLatLng(null)
    setShowForm(false)
  }

  const handleDelete = (id) => {
    save(hubs.filter(h => h.id !== id))
  }

  const center = safeCenter(hubs)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Carte des Hubs</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cliquez sur la carte pour placer un nouveau hub.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-label-md text-label-md shadow-sm transition-all ${showForm ? 'bg-error text-on-error' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
        >
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Annuler' : 'Ajouter un hub'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border-2 border-primary bg-surface-container-lowest p-4 shadow-sm">
          <p className="font-label-md text-label-md text-primary font-bold mb-2">
            {pendingLatLng ? `Position sélectionnée : ${pendingLatLng.lat.toFixed(4)}, ${pendingLatLng.lng.toFixed(4)}` : 'Cliquez sur la carte pour placer le hub'}
          </p>
          <div className="flex gap-3">
            <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du hub" className="flex-1 rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md" />
            <input type="text" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse (optionnel)" className="flex-1 rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md" />
            <button onClick={handleSave} disabled={!pendingLatLng || !form.nom.trim()} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md font-bold disabled:opacity-50">Créer</button>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-outline-variant shadow-sm" style={{ height: '500px' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <CachedTiles attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onClick={handleMapClick} />
          {hubs.filter(h => typeof h.lat === 'number' && typeof h.lng === 'number').map((hub) => (
            <Marker key={hub.id} position={[hub.lat, hub.lng]} icon={hubIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-bold">{hub.nom}</p>
                  <p className="text-sm text-gray-600">{hub.adresse}</p>
                  <button onClick={() => handleDelete(hub.id)} className="mt-2 text-red-600 text-sm font-bold hover:underline">Supprimer</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {hubs.map((hub) => (
          <div key={hub.id} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant bg-surface-container-lowest">
            <span className="material-symbols-outlined text-primary">location_on</span>
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-label-md font-bold truncate">{hub.nom}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{hub.adresse}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CarteHubsPage
