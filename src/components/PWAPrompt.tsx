import { useCallback, useState } from 'react'
import { usePWA } from '../hooks/usePWA'

/**
 * PWA Install and Update Prompt Component
 * Shows install banner when app can be installed
 * Shows update notification when new version is available
 */
export function PWAPrompt() {
  const { canInstall, hasUpdate, promptInstall, applyUpdate } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)

  const handleInstall = useCallback(async () => {
    const installed = await promptInstall()
    if (!installed) {
      setDismissed(true)
    }
  }, [promptInstall])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  const handleUpdate = useCallback(() => {
    applyUpdate()
  }, [applyUpdate])

  const handleUpdateDismiss = useCallback(() => {
    setUpdateDismissed(true)
  }, [])

  return (
    <>
      {/* Install Banner */}
      {canInstall && !dismissed && (
        <div className="pwa-banner">
          <div className="pwa-banner-content">
            <span className="pwa-banner-icon">📱</span>
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
        <div className="pwa-update-banner">
          <div className="pwa-banner-content">
            <span className="pwa-banner-icon">🔄</span>
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
