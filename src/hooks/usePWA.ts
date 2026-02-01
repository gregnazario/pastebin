import { useCallback, useEffect, useState } from 'react'

/**
 * BeforeInstallPromptEvent interface for PWA install prompt
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

/**
 * PWA state and actions
 */
export interface PWAState {
  /** Whether the app can be installed (install prompt available) */
  canInstall: boolean
  /** Whether the app is already installed (running in standalone mode) */
  isInstalled: boolean
  /** Whether there's a service worker update available */
  hasUpdate: boolean
  /** Trigger the install prompt */
  promptInstall: () => Promise<boolean>
  /** Apply the pending update */
  applyUpdate: () => void
}

/**
 * Hook to manage PWA functionality including:
 * - Service worker registration
 * - Install prompt handling
 * - Update detection
 */
export function usePWA(): PWAState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    // Skip on server
    if (typeof window === 'undefined') return

    // Check if running in standalone mode (installed PWA)
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      setIsInstalled(isStandalone)
    }

    checkInstalled()

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)

    return () => {
      mediaQuery.removeEventListener('change', checkInstalled)
    }
  }, [])

  useEffect(() => {
    // Capture the install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful installation
    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service worker registered')

          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  setHasUpdate(true)
                  setWaitingWorker(newWorker)
                }
              })
            }
          })

          // Check for waiting worker on load
          if (registration.waiting) {
            setHasUpdate(true)
            setWaitingWorker(registration.waiting)
          }
        })
        .catch((error) => {
          console.error('[PWA] Service worker registration failed:', error)
        })

      // Handle controller change (when update is applied)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      return false
    }

    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      setInstallPrompt(null)
      return true
    }

    return false
  }, [installPrompt])

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage('skipWaiting')
    }
  }, [waitingWorker])

  return {
    canInstall: installPrompt !== null,
    isInstalled,
    hasUpdate,
    promptInstall,
    applyUpdate,
  }
}
