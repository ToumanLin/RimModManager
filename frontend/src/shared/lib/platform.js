export const isMacDesktopPywebview = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !window.pywebview) return false
  const platform = String(navigator.userAgentData?.platform || navigator.platform || '').toLowerCase()
  const userAgent = String(navigator.userAgent || '').toLowerCase()
  return platform.includes('mac') || userAgent.includes('mac os x')
}

export const supportsViewerDirective = () => !isMacDesktopPywebview()

export const supportsInlineColorPicker = () => !isMacDesktopPywebview()
