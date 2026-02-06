import { createFileRoute, Link } from '@tanstack/react-router'
import { ChainIcon, KeyIcon, QuantumIcon } from '../components/Icons'
import { Onboarding } from '../components/Onboarding'
import { PasteHistory } from '../components/PasteHistory'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="home-page">
      <Onboarding />
      <section className="hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading">Secure Pastebin</h1>
        <p className="tagline">Share files securely with post-quantum encryption</p>

        <ul className="features" aria-label="Key features">
          <li className="feature">
            <h2>
              <QuantumIcon size="1.2em" className="feature-icon" aria-hidden /> Post-Quantum Security
            </h2>
            <p>
              ML-KEM (Kyber) + AES-256-GCM hybrid encryption protects against future quantum attacks
            </p>
          </li>
          <li className="feature">
            <h2>
              <KeyIcon size="1.2em" className="feature-icon" aria-hidden /> Password Protected
            </h2>
            <p>Argon2id key derivation ensures strong password-based protection</p>
          </li>
          <li className="feature">
            <h2>
              <ChainIcon size="1.2em" className="feature-icon" aria-hidden /> Decentralized Storage
            </h2>
            <p>Files stored on Shelby Protocol — censorship-resistant and reliable</p>
          </li>
        </ul>

        <Link to="/upload" className="upload-button" aria-label="Upload a file — encrypt and share securely">
          Upload a File
        </Link>
      </section>

      <section className="history-section" aria-label="Recent uploads">
        <PasteHistory maxItems={5} showClearAll={false} compact />
      </section>
    </div>
  )
}
