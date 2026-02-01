import { useCallback, useEffect, useState } from 'react'
import { usePWA } from '../hooks/usePWA'

/**
 * PWA Install and Update Prompt Component
 * Shows install banner when app can be installed
 * Shows update notification when new version is available
 */
export function PWAPrompt() {
  const { canInstall, hasUpdate, isInstalled, promptInstall, applyUpdate } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only render after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    // Check if previously dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa-banner-dismissed')
    if (wasDismissed) {
      setDismissed(true)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    const installed = await promptInstall()
    if (!installed) {
      setDismissed(true)
      sessionStorage.setItem('pwa-banner-dismissed', 'true')
    }
  }, [promptInstall])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    sessionStorage.setItem('pwa-banner-dismissed', 'true')
  }, [])

  const handleUpdate = useCallback(() => {
    applyUpdate()
  }, [applyUpdate])

  const handleUpdateDismiss = useCallback(() => {
    setUpdateDismissed(true)
  }, [])

  // Don't render during SSR or if already installed
  if (!mounted || isInstalled) {
    return null
  }

  return (
    <>
      {/* Install Banner */}
      {canInstall && !dismissed && (
        <div className="pwa-banner" role="alert">
          <div className="pwa-banner-content">
            <span className="pwa-banner-icon" aria-hidden="true">
              📱
            </span>
            <div className="pwa-banner-text">
              <strong>Install Secure Pastebin</strong>
              <span>Add to your home screen for quick access</span>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button
              type="button"
              className="pwa-banner-dismiss"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
            >
              Not now
            </button>
            <button type="button" className="pwa-banner-install" onClick={handleInstall}>
              Install
            </button>
          </div>
        </div>
      )}

      {/* Update Notification */}
      {hasUpdate && !updateDismissed && (
        <div className="pwa-update-banner" role="alert">
          <div className="pwa-banner-content">
            <span className="pwa-banner-icon" aria-hidden="true">
              🔄
            </span>
            <div className="pwa-banner-text">
              <strong>Update Available</strong>
              <span>A new version is ready to install</span>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button
              type="button"
              className="pwa-banner-dismiss"
              onClick={handleUpdateDismiss}
              aria-label="Dismiss update prompt"
            >
              Later
            </button>
            <button type="button" className="pwa-banner-install" onClick={handleUpdate}>
              Update
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Re-export usePWA hook for use in other components
 * (e.g., for an "Install App" button in mobile menu)
 */
export { usePWA }
