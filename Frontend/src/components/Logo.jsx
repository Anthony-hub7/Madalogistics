export default function Logo({ size = 40, showText = true, branding }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 82 82" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
        <circle cx="41" cy="41" r="41" fill="#E8433D"/>
        <g transform="translate(11,23)">
          <path d="M2 6C2 3.8 3.8 2 6 2L34 2C36.2 2 38 3.8 38 6L38 34L2 34Z" fill="#F5F5F0"/>
          <path d="M38 14L50 14C52 14 53.5 15 54.5 16.8L60 26C60.6 27 61 28.2 61 29.4L61 34L38 34Z" fill="#F5F5F0" opacity="0.85"/>
          <rect x="43" y="17" width="12" height="9" rx="1.5" fill="#E8433D"/>
          <circle cx="14" cy="38" r="7" fill="#F5F5F0"/>
          <circle cx="14" cy="38" r="2.6" fill="#E8433D"/>
          <circle cx="49" cy="38" r="7" fill="#F5F5F0"/>
          <circle cx="49" cy="38" r="2.6" fill="#E8433D"/>
        </g>
      </svg>
      {showText && (
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight leading-none">
            <span className="text-[#1A1A1E]">Mada</span>
            <span className="text-[#E8433D]">Logistix</span>
          </h2>
          <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant mt-0.5">
            {branding?.subtitle || 'CORRIDOR RN7 · FRET'}
          </p>
        </div>
      )}
    </div>
  )
}
