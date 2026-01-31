import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>Secure Pastebin</h1>
        <p className="tagline">
          Share files securely with post-quantum encryption
        </p>
        
        <div className="features">
          <div className="feature">
            <h3>🔐 Post-Quantum Security</h3>
            <p>ML-KEM (Kyber) + AES-256-GCM hybrid encryption protects against future quantum attacks</p>
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

      <style>{`
        .home-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          text-align: center;
        }

        .hero h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          color: #1a1a2e;
        }

        .tagline {
          font-size: 1.2rem;
          color: #666;
          margin-bottom: 40px;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 30px;
          margin-bottom: 40px;
          text-align: left;
        }

        .feature {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .feature h3 {
          margin-top: 0;
          font-size: 1.1rem;
        }

        .feature p {
          margin-bottom: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .upload-button {
          display: inline-block;
          padding: 15px 40px;
          background: #2c3e50;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .upload-button:hover {
          background: #1a252f;
        }
      `}</style>
    </div>
  )
}
