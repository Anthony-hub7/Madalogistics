import { useRef, useEffect, useState } from 'react'

const STEPS = [
  { key: 'photo', label: 'Photo', icon: 'photo_camera' },
  { key: 'signature', label: 'Signature', icon: 'gesture' },
  { key: 'validation', label: 'Validation', icon: 'check_circle' },
]

function ConfirmationLivraison({ delivery, onConfirm, onClose }) {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [photoData, setPhotoData] = useState(null)
  const [notes, setNotes] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [currentStep, setCurrentStep] = useState('photo')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#F5F5F0'

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      canvas.width = r.width
      canvas.height = r.height
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#F5F5F0'
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX || (e.touches && e.touches[0].clientX)
    const clientY = e.clientY || (e.touches && e.touches[0].clientY)
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    setHasSignature(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const stopDraw = () => {
    setDrawing(false)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handlePhotoCapture = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhotoData(ev.target.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleStepNext = () => {
    if (currentStep === 'photo') setCurrentStep('signature')
    else if (currentStep === 'signature') setCurrentStep('validation')
  }

  const handleStepBack = () => {
    if (currentStep === 'signature') setCurrentStep('photo')
    else if (currentStep === 'validation') setCurrentStep('signature')
    else onClose()
  }

  const handleConfirm = () => {
    setConfirming(true)
    setTimeout(() => {
      if (onConfirm) onConfirm()
    }, 1500)
  }

  const stepIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      <header className="bg-surface/80 backdrop-blur-md flex items-center justify-between border-b border-outline-variant px-margin-mobile h-16 flex-shrink-0">
        <button onClick={handleStepBack} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-label-md text-label-md">
            {currentStep === 'photo' ? 'Annuler' : 'Retour'}
          </span>
        </button>
        <h1 className="font-headline-md text-headline-md text-primary font-bold">Confirmation</h1>
        <div className="w-20" />
      </header>

      <div className="px-margin-mobile pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${
                idx <= stepIndex ? 'text-primary' : 'text-outline/40'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  idx < stepIndex ? 'bg-secondary text-on-secondary' :
                  idx === stepIndex ? 'bg-primary text-on-primary' :
                  'bg-surface-container-high border border-outline-variant/30'
                }`}>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: idx < stepIndex ? "'FILL' 1" : "'FILL' 0" }}>
                    {idx < stepIndex ? 'check' : step.icon}
                  </span>
                </div>
                <span className={`font-label-sm text-label-sm hidden sm:inline ${
                  idx <= stepIndex ? 'text-on-surface' : 'text-outline/40'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${
                  idx < stepIndex ? 'bg-secondary' : 'bg-outline-variant/30'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-margin-mobile py-6 space-y-6">

          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Récapitulatif de livraison</span>
            <h2 className="font-headline-md text-headline-md text-on-surface mt-1">#{delivery.id}</h2>
            <p className="font-body-md text-body-md font-bold text-on-surface mt-1">{delivery.client}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">location_on</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{delivery.address}</span>
            </div>
          </section>

          {currentStep === 'photo' && (
            <section className="space-y-4">
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant ml-1 mb-3 block">
                  Preuve visuelle <span className="text-error">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {photoData ? (
                  <div className="space-y-3">
                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-outline-variant shadow-sm bg-surface-container-low">
                      <img
                        src={photoData}
                        alt="Preuve de livraison"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handlePhotoCapture}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container transition-all active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined">photo_camera</span>
                        <span className="font-label-md text-label-md">Reprendre</span>
                      </button>
                      <button
                        onClick={() => setPhotoData(null)}
                        className="flex items-center justify-center gap-2 py-3 px-5 border-2 border-error-container/50 rounded-xl text-error hover:bg-error-container/10 transition-all active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handlePhotoCapture}
                    className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container hover:border-primary/40 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                      <span className="material-symbols-outlined text-3xl text-primary/60 group-hover:text-primary">photo_camera</span>
                    </div>
                    <div className="text-center">
                      <p className="font-body-md text-body-md font-bold text-on-surface">Ajouter photo preuve</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Photo du colis livré ou du lieu de dépôt</p>
                    </div>
                  </button>
                )}
              </div>
            </section>
          )}

          {currentStep === 'signature' && (
            <section className="space-y-4">
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant ml-1 mb-3 block">
                  Signature du client
                </label>
                <div className="relative w-full aspect-video bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                      <div className="text-center opacity-30">
                        <span className="material-symbols-outlined text-6xl block mb-2">gesture</span>
                        <span className="font-body-sm text-body-sm">Signez ici</span>
                      </div>
                    </div>
                  )}
                  {hasSignature && (
                    <div className="absolute bottom-2 right-2">
                      <button
                        onClick={clearSignature}
                        className="flex items-center gap-1.5 bg-surface-variant/80 backdrop-blur-sm text-on-surface-variant px-3 py-1.5 rounded-lg hover:bg-surface-variant transition-colors text-sm"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        <span className="font-label-sm text-label-sm">Effacer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-label-md text-label-md text-on-surface-variant ml-1 mb-2 block">
                  Commentaires <span className="text-outline/60">(optionnel)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none h-24 outline-none"
                  placeholder="Précisez ici toute remarque sur l'état du colis..."
                />
              </div>
            </section>
          )}

          {currentStep === 'validation' && (
            <section className="space-y-4">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-4">
                <h3 className="font-headline-md text-headline-md text-on-surface">Vérification finale</h3>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    photoData ? 'bg-secondary/10' : 'bg-error-container/20'
                  }`}>
                    <span className={`material-symbols-outlined text-lg ${
                      photoData ? 'text-secondary' : 'text-error'
                    }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {photoData ? 'check' : 'close'}
                    </span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md font-bold text-on-surface">Photo preuve</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {photoData ? 'Photo ajoutée' : 'Aucune photo — revenez à l\'étape précédente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    hasSignature ? 'bg-secondary/10' : 'bg-warning/10'
                  }`}>
                    <span className={`material-symbols-outlined text-lg ${
                      hasSignature ? 'text-secondary' : 'text-tertiary'
                    }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {hasSignature ? 'check' : 'edit'}
                    </span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md font-bold text-on-surface">Signature client</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {hasSignature ? 'Signature collectée' : 'Non signé (optionnel)'}
                    </p>
                  </div>
                </div>

                {notes && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">notes</span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-bold text-on-surface">Commentaire</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary flex-shrink-0">info</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  En confirmant, vous certifiez que la livraison a été effectuée conformément aux instructions.
                </p>
              </div>
            </section>
          )}

        </div>
      </div>

      <footer className="bg-surface/80 backdrop-blur-md px-margin-mobile pt-4 pb-8 border-t border-outline-variant flex-shrink-0">
        {currentStep !== 'validation' ? (
          <button
            onClick={handleStepNext}
            disabled={currentStep === 'photo' && !photoData}
            className="w-full h-16 bg-primary text-white rounded-xl font-headline-md flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">
              {currentStep === 'photo' ? 'arrow_forward' : 'arrow_forward'}
            </span>
            {currentStep === 'photo' ? 'Ajouter la signature' : 'Vérifier et confirmer'}
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full h-16 bg-secondary text-on-secondary rounded-xl font-headline-md flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all duration-150 disabled:cursor-wait"
          >
            {confirming ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Traitement...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Confirmer la livraison
              </>
            )}
          </button>
        )}
      </footer>
    </div>
  )
}

export default ConfirmationLivraison
