import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>Secure Pastebin</h1>
        <p className="tagline">Share files securely with post-quantum encryption</p>

        <div className="features">
          <div className="feature">
            <h3>🔐 Post-Quantum Security</h3>
            <p>
              ML-KEM (Kyber) + AES-256-GCM hybrid encryption protects against future quantum attacks
            </p>
          </div>
          <div className="feature">
            <h3>🔑 Password Protected</h3>
            <p>Argon2id key derivation ensures strong password-based protection</p>
          </div>
          <div className="feature">
            <h3>⛓️ Decentralized Storage</h3>
            <p>Files stored on Shelby Protocol - censorship-resistant and reliable</p>
          </div>
        </div>

        <Link to="/upload" className="upload-button">
          Upload a File
        </Link>
      </div>
    </div>
  )
}
