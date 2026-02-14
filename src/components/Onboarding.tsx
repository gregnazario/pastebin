import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LinkIcon, LockIcon, ShieldIcon, WaveIcon } from './Icons'

const ONBOARDING_KEY = 'secure-pastebin-onboarding-seen'

/**
 * Onboarding component that shows first-time users key features.
 * Implements proper focus trap and ARIA dialog pattern for accessibility.
 */
export function Onboarding() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Check if user has already seen onboarding
    const hasSeen = localStorage.getItem(ONBOARDING_KEY)
    if (!hasSeen) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  // Focus management: trap focus inside modal and restore on close
  useEffect(() => {
    if (isVisible) {
      // Save the currently focused element to restore later
      previousActiveElement.current = document.activeElement as HTMLElement

      // Focus the modal after a brief delay to let it render
      const timer = setTimeout(() => {
        modalRef.current?.focus()
      }, 50)

      return () => clearTimeout(timer)
    }

    // Restore focus when modal closes
    if (previousActiveElement.current) {
      previousActiveElement.current.focus()
      previousActiveElement.current = null
    }
  }, [isVisible])

  // Focus trap: keep tab cycling inside the modal
  useEffect(() => {
    if (!isVisible) return

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleFocusTrap)
    return () => document.removeEventListener('keydown', handleFocusTrap)
  }, [isVisible])

  const dismiss = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsVisible(false)
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      dismiss()
    }
  }, [currentStep, dismiss])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss()
      }
    },
    [dismiss],
  )

  if (!isVisible) return null

  const step = steps[currentStep]

  return (
    <div
      className="onboarding-overlay"
      onClick={dismiss}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Modal content div needs click/key handlers to prevent event propagation to overlay */}
      <div
        ref={modalRef}
        className="onboarding-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <button
          type="button"
          className="onboarding-close"
          onClick={dismiss}
          aria-label="Close onboarding"
        >
          ×
        </button>

        <div className="onboarding-icon" aria-hidden="true">{step.icon}</div>
        <h2 id="onboarding-title" className="onboarding-title">
          {step.title}
        </h2>
        <p id="onboarding-description" className="onboarding-description">{step.description}</p>

        {/* biome-ignore lint/a11y/useSemanticElements: Progress dots are decorative indicators, not a form group */}
        <div className="onboarding-progress" role="group" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
          {steps.map((s, index) => (
            <span
              key={index}
              className={`onboarding-dot ${index === currentStep ? 'active' : ''}`}
              aria-label={`Step ${index + 1}: ${s.title}${index === currentStep ? ' (current)' : ''}`}
              role="img"
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={dismiss}>
            Skip
          </button>
          <button type="button" className="onboarding-next" onClick={nextStep}>
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Onboarding step type
 */
interface OnboardingStep {
  icon: ReactNode
  title: string
  description: string
}

/**
 * Onboarding steps configuration
 */
const steps: OnboardingStep[] = [
  {
    icon: <WaveIcon size={48} />,
    title: 'Welcome to SecuPaste',
    description:
      'Share files with post-quantum encryption. Your files are encrypted in your browser before upload — we never see your data.',
  },
  {
    icon: <LockIcon size={48} />,
    title: 'Client-Side Encryption',
    description:
      'All encryption happens locally. Your password and files never leave your device unencrypted.',
  },
  {
    icon: <ShieldIcon size={48} />,
    title: 'Future-Proof Security',
    description:
      'We use ML-KEM (Kyber) + AES-256-GCM hybrid encryption to protect against future quantum computer attacks.',
  },
  {
    icon: <LinkIcon size={48} />,
    title: 'Safe Link Sharing',
    description:
      "The decryption key is embedded in the URL fragment (#) — it's never sent to any server. Share links via secure channels.",
  },
]
