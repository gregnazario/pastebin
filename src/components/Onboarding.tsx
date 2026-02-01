import { useCallback, useEffect, useState } from 'react'

const ONBOARDING_KEY = 'secure-pastebin-onboarding-seen'

/**
 * Onboarding component that shows first-time users key features
 */
export function Onboarding() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user has already seen onboarding
    const hasSeen = localStorage.getItem(ONBOARDING_KEY)
    if (!hasSeen) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

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
    >
      <div
        className="onboarding-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <button
          type="button"
          className="onboarding-close"
          onClick={dismiss}
          aria-label="Close onboarding"
        >
          ×
        </button>

        <div className="onboarding-icon">{step.icon}</div>
        <h2 id="onboarding-title" className="onboarding-title">
          {step.title}
        </h2>
        <p className="onboarding-description">{step.description}</p>

        <div className="onboarding-progress">
          {steps.map((_, index) => (
            <span
              key={index}
              className={`onboarding-dot ${index === currentStep ? 'active' : ''}`}
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
 * Onboarding steps configuration
 */
const steps = [
  {
    icon: '👋',
    title: 'Welcome to Secure Pastebin',
    description:
      'Share files with post-quantum encryption. Your files are encrypted in your browser before upload — we never see your data.',
  },
  {
    icon: '🔐',
    title: 'Client-Side Encryption',
    description:
      'All encryption happens locally. Your password and files never leave your device unencrypted.',
  },
  {
    icon: '🛡️',
    title: 'Future-Proof Security',
    description:
      'We use ML-KEM (Kyber) + AES-256-GCM hybrid encryption to protect against future quantum computer attacks.',
  },
  {
    icon: '🔗',
    title: 'Safe Link Sharing',
    description:
      "The decryption key is embedded in the URL fragment (#) — it's never sent to any server. Share links via secure channels.",
  },
]
