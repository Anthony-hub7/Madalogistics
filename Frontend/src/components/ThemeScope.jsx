import { useEffect } from 'react'

/**
 * Applies theme tokens to the document root so body, portals and fixed overlays
 * inherit the correct CSS variables.
 */
export default function ThemeScope({ theme = 'light', children, className = '', ...props }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    return () => document.documentElement.removeAttribute('data-theme')
  }, [theme])

  return (
    <div className={className} data-theme={theme} {...props}>
      {children}
    </div>
  )
}
