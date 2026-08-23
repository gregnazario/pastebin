import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  AlertIcon,
  CheckIcon,
  EyeIcon,
  ShieldIcon,
  WrenchIcon,
  XCircleIcon,
} from '../components/Icons'

export const Route = createFileRoute('/docs')({
  component: DocsPage,
})

/** Unique ID counter for collapsible sections */
let collapsibleIdCounter = 0

/**
 * Collapsible section component for technical details.
 * Uses proper ARIA disclosure pattern for accessibility.
 */
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [panelId] = useState(() => `collapsible-panel-${++collapsibleIdCounter}`)
  const [buttonId] = useState(() => `collapsible-btn-${collapsibleIdCounter}`)

  return (
    <div className="collapsible-section">
      <button
        type="button"
        id={buttonId}
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span>{title}</span>
        <span className="collapsible-icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <section
          id={panelId}
          className="collapsible-content"
          aria-labelledby={buttonId}
        >
          {children}
        </section>
      )}
    </div>
  )
}

/**
 * Animated encryption flow diagram component
 */
function EncryptionFlowDiagram() {
  return (
    <div className="flow-diagram">
      <svg
        viewBox="0 0 800 400"
        className="encryption-animation"
        aria-labelledby="encryption-flow-title"
      >
        <title id="encryption-flow-title">
          Encryption flow diagram showing how files are encrypted and uploaded
        </title>
        {/* Background sections */}
        <rect x="0" y="0" width="400" height="400" fill="var(--diagram-bg-local)" />
        <rect x="400" y="0" width="400" height="400" fill="var(--diagram-bg-cloud)" />

        {/* Section labels */}
        <text x="200" y="30" textAnchor="middle" className="section-label">
          Your Device
        </text>
        <text x="600" y="30" textAnchor="middle" className="section-label">
          Encrypted Storage
        </text>

        {/* Step 1: File + Password */}
        <g className="step step-1">
          <rect x="100" y="60" width="200" height="50" rx="8" className="node" />
          <text x="200" y="90" textAnchor="middle" className="node-text">
            File + Password
          </text>
          <text x="200" y="125" textAnchor="middle" className="step-label">
            1. Select file &amp; enter password
          </text>
        </g>

        {/* Arrow 1→2 */}
        <g className="arrow arrow-1">
          <line x1="200" y1="135" x2="200" y2="165" className="arrow-line" />
          <polygon points="200,175 195,165 205,165" className="arrow-head" />
        </g>

        {/* Step 2: Key Derivation */}
        <g className="step step-2">
          <rect x="100" y="180" width="200" height="50" rx="8" className="node node-process" />
          <text x="200" y="210" textAnchor="middle" className="node-text">
            Argon2id KDF
          </text>
          <text x="200" y="245" textAnchor="middle" className="step-label">
            2. Derive encryption key
          </text>
        </g>

        {/* Arrow 2→3 */}
        <g className="arrow arrow-2">
          <line x1="200" y1="255" x2="200" y2="285" className="arrow-line" />
          <polygon points="200,295 195,285 205,285" className="arrow-head" />
        </g>

        {/* Step 3: Encryption */}
        <g className="step step-3">
          <rect x="100" y="300" width="200" height="50" rx="8" className="node node-process" />
          <text x="200" y="330" textAnchor="middle" className="node-text">
            ML-KEM + AES-256
          </text>
          <text x="200" y="365" textAnchor="middle" className="step-label">
            3. Encrypt file
          </text>
        </g>

        {/* Arrow 3→4 (upload) */}
        <g className="arrow arrow-3">
          <line x1="300" y1="325" x2="480" y2="200" className="arrow-line arrow-upload" />
          <polygon points="490,195 478,192 482,204" className="arrow-head" />
          <text x="390" y="245" textAnchor="middle" className="arrow-label">
            4. Upload encrypted
          </text>
        </g>

        {/* Step 4: Cloud Storage */}
        <g className="step step-4">
          <rect x="500" y="150" width="200" height="80" rx="8" className="node node-cloud" />
          <text x="600" y="185" textAnchor="middle" className="node-text">
            Encrypted Blob
          </text>
          <text x="600" y="210" textAnchor="middle" className="node-subtext">
            Stored securely
          </text>
        </g>

        {/* Arrow back for share link */}
        <g className="arrow arrow-4">
          <line x1="500" y1="260" x2="320" y2="380" className="arrow-line arrow-return" />
          <polygon points="310,385 322,378 318,390" className="arrow-head" />
        </g>

        {/* Step 5: Share Link */}
        <g className="step step-5">
          <rect x="50" y="370" width="260" height="25" rx="4" className="node node-link" />
          <text x="180" y="388" textAnchor="middle" className="node-text-small">
            pastebin.sed.fyi/p/id#key
          </text>
        </g>

        {/* Key never leaves device indicator */}
        <g className="security-note">
          <rect x="420" y="340" width="160" height="50" rx="6" className="note-box" />
          <text x="500" y="360" textAnchor="middle" className="note-text">
            Key in URL fragment
          </text>
          <text x="500" y="378" textAnchor="middle" className="note-subtext">
            Never sent to server
          </text>
        </g>
      </svg>
    </div>
  )
}

function DocsPage() {
  return (
    <div className="docs-page">
      <h1>How SecuPaste Works</h1>
      <p className="docs-intro">
        SecuPaste uses cutting-edge post-quantum cryptography to protect your files. All
        encryption happens in your browser — we never see your files or passwords.
      </p>

      {/* How It Works Section */}
      <section className="docs-section">
        <h2>How It Works</h2>
        <p>
          When you upload a file, it's encrypted entirely on your device before being sent to object
          storage as ciphertext. Here's the process:
        </p>

        <EncryptionFlowDiagram />

        <ol className="process-steps">
          <li>
            <strong>Select your file and enter a password</strong> — Your password never leaves your
            device.
          </li>
          <li>
            <strong>Key derivation with Argon2id</strong> — Your password is transformed into a
            cryptographic key using a memory-hard function that resists brute-force attacks.
          </li>
          <li>
            <strong>Hybrid encryption</strong> — Your file is encrypted using ML-KEM (Kyber) for key
            exchange and AES-256-GCM for content encryption.
          </li>
          <li>
            <strong>Upload ciphertext</strong> — Only the encrypted blob is uploaded. The server
            cannot read the file.
          </li>
          <li>
            <strong>Share the link</strong> — The decryption key is embedded in the URL fragment
            (#), which is never sent to any server.
          </li>
        </ol>

        <CollapsibleSection
          title={
            <>
              <WrenchIcon size="1em" className="section-icon" /> Technical Details
            </>
          }
        >
          <ul className="tech-details">
            <li>
              <strong>Key Encapsulation:</strong> ML-KEM-768 (Kyber) - NIST post-quantum standard
            </li>
            <li>
              <strong>Symmetric Encryption:</strong> AES-256-GCM with 96-bit nonce
            </li>
            <li>
              <strong>Key Derivation:</strong> Argon2id (memory: 64MB, iterations: 3, parallelism:
              1)
            </li>
            <li>
              <strong>Salt:</strong> 32 bytes, cryptographically random
            </li>
          </ul>
        </CollapsibleSection>
      </section>

      {/* Security Model Section */}
      <section className="docs-section">
        <h2>Security Model</h2>
        <p>
          Our security model is built on the principle of <strong>zero knowledge</strong>. Even if
          our servers were completely compromised, your files would remain secure.
        </p>

        <div className="security-grid">
          <div className="security-card security-protected">
            <h3>
              <CheckIcon size="1em" className="section-icon" /> What's Protected
            </h3>
            <ul>
              <li>File contents — always encrypted</li>
              <li>File name — optionally encrypted</li>
              <li>Your password — never transmitted</li>
              <li>Decryption key — stays in URL fragment</li>
            </ul>
          </div>

          <div className="security-card security-threat">
            <h3>
              <ShieldIcon size="1em" className="section-icon" /> Protected Against
            </h3>
            <ul>
              <li>Server breaches — encrypted data is useless without keys</li>
              <li>Man-in-the-middle attacks — key never in HTTP request</li>
              <li>Future quantum computers — post-quantum algorithms</li>
              <li>Brute force attacks — Argon2id is memory-hard</li>
            </ul>
          </div>
        </div>

        <CollapsibleSection
          title={
            <>
              <WrenchIcon size="1em" className="section-icon" /> Technical Details
            </>
          }
        >
          <p>
            The hybrid encryption scheme uses ML-KEM-768 for key encapsulation, which provides
            approximately 192 bits of classical security and is resistant to known quantum attacks.
            The encapsulated key is combined with the password-derived key to produce the final
            AES-256 encryption key.
          </p>
          <p>
            URL fragments (the part after #) are defined by RFC 3986 to never be sent in HTTP
            requests. This means the decryption key physically cannot reach our servers through
            normal browser behavior.
          </p>
        </CollapsibleSection>
      </section>

      {/* Why Post-Quantum Section */}
      <section className="docs-section">
        <h2>Why Post-Quantum Encryption?</h2>
        <p>
          Traditional encryption like RSA and elliptic curves will be broken when large-scale
          quantum computers become available. This creates a serious threat called
          <strong> "harvest now, decrypt later"</strong>:
        </p>

        <div className="warning-box">
          <p>
            <strong>
              <AlertIcon size="1em" className="section-icon" /> The Threat:
            </strong>{' '}
            Adversaries can record encrypted data today and store it until quantum computers can
            break the encryption — potentially exposing secrets years or decades later.
          </p>
        </div>

        <p>
          We use <strong>ML-KEM (formerly Kyber)</strong>, which was selected by NIST in 2024 as the
          primary post-quantum key encapsulation standard. It's based on lattice problems that are
          believed to be hard for both classical and quantum computers.
        </p>

        <CollapsibleSection
          title={
            <>
              <WrenchIcon size="1em" className="section-icon" /> Technical Details
            </>
          }
        >
          <p>
            ML-KEM-768 is based on the Module Learning with Errors (MLWE) problem. The security
            relies on the difficulty of distinguishing structured lattice samples from random ones.
            Even Shor's algorithm, which breaks RSA and ECC, cannot efficiently solve lattice
            problems.
          </p>
          <p>
            We use a hybrid approach: even if ML-KEM were broken, your data would still be protected
            by AES-256, which requires Grover's algorithm (offering only quadratic speedup) and
            remains secure with 128+ bits of post-quantum security.
          </p>
        </CollapsibleSection>
      </section>

      {/* Privacy Guarantees Section */}
      <section className="docs-section">
        <h2>Privacy Guarantees</h2>
        <p>We believe in transparency about what we can and cannot access.</p>

        <div className="privacy-grid">
          <div className="privacy-card cannot-see">
            <h3>
              <XCircleIcon size="1em" className="section-icon" /> We Cannot See
            </h3>
            <ul>
              <li>Your file contents</li>
              <li>Your file name (if metadata encryption enabled)</li>
              <li>Your password</li>
              <li>The decryption key</li>
              <li>Who accessed a specific file (no tracking)</li>
            </ul>
          </div>

          <div className="privacy-card can-see">
            <h3>
              <EyeIcon size="1em" className="section-icon" /> We Can See
            </h3>
            <ul>
              <li>Encrypted blob size</li>
              <li>Upload timestamp</li>
              <li>IP addresses (standard server logs)</li>
              <li>File expiration date</li>
            </ul>
          </div>
        </div>

        <p className="privacy-note">
          <strong>Note:</strong> Standard server logs may record IP addresses for security and abuse
          prevention. Consider using a VPN or Tor if IP privacy is important to you.
        </p>
      </section>

      {/* Technical Specifications Section */}
      <section className="docs-section">
        <h2>Technical Specifications</h2>

        <CollapsibleSection title="Cryptographic Parameters" defaultOpen>
          <table className="specs-table" aria-label="Cryptographic parameters">
            <thead className="sr-only">
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Key Encapsulation</th>
                <td>ML-KEM-768 (Kyber)</td>
              </tr>
              <tr>
                <th scope="row">Symmetric Cipher</th>
                <td>AES-256-GCM</td>
              </tr>
              <tr>
                <th scope="row">Key Derivation</th>
                <td>Argon2id</td>
              </tr>
              <tr>
                <th scope="row">Argon2id Memory</th>
                <td>64 MB</td>
              </tr>
              <tr>
                <th scope="row">Argon2id Iterations</th>
                <td>3</td>
              </tr>
              <tr>
                <th scope="row">Argon2id Parallelism</th>
                <td>1</td>
              </tr>
              <tr>
                <th scope="row">Salt Length</th>
                <td>32 bytes</td>
              </tr>
              <tr>
                <th scope="row">Nonce Length</th>
                <td>12 bytes (96 bits)</td>
              </tr>
            </tbody>
          </table>
        </CollapsibleSection>

        <CollapsibleSection title="Storage & Limits">
          <table className="specs-table" aria-label="Storage and limits">
            <thead className="sr-only">
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Maximum File Size</th>
                <td>100 MB</td>
              </tr>
              <tr>
                <th scope="row">Storage Backend</th>
                <td>Filesystem (local) or S3-compatible object storage (Cloudflare R2)</td>
              </tr>
              <tr>
                <th scope="row">Link Validity</th>
                <td>30 days default (configurable)</td>
              </tr>
              <tr>
                <th scope="row">Encryption Location</th>
                <td>Client-side (browser)</td>
              </tr>
            </tbody>
          </table>
        </CollapsibleSection>
      </section>

      {/* FAQ Section */}
      <section className="docs-section">
        <h2>Frequently Asked Questions</h2>

        <div className="faq-list">
          <CollapsibleSection title="What if I forget my password?">
            <p>
              Unfortunately, if you forget your password, your file cannot be recovered. This is by
              design — if we could recover your file without the password, so could an attacker. We
              recommend using a password manager to store important passwords.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="How long are files stored?">
            <p>
              Files use a configurable expiration policy. By default, deployments keep files for 30
              days unless <code>DEFAULT_EXPIRATION_DAYS</code> is overridden. After expiration, the
              blob is no longer served and is removed when accessed. Configure a bucket lifecycle
              rule on the <code>pastes/</code> prefix so unused objects are deleted even if nobody
              downloads them.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Is this really secure?">
            <p>
              Yes, as long as you use a strong password. The encryption uses industry-standard
              algorithms (AES-256-GCM) combined with post-quantum protection (ML-KEM). All
              encryption happens in your browser — we never have access to your unencrypted data or
              passwords.
            </p>
            <p>That said, no system is perfect. Potential risks include:</p>
            <ul>
              <li>Weak passwords (use 12+ characters with variety)</li>
              <li>Malware on your device (we can't protect against compromised browsers)</li>
              <li>Sharing links insecurely (use encrypted messaging)</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="What is post-quantum encryption?">
            <p>
              Post-quantum encryption uses mathematical problems that quantum computers cannot solve
              efficiently. Traditional encryption (RSA, ECC) relies on factoring and discrete
              logarithm problems, which quantum computers can break using Shor's algorithm.
            </p>
            <p>
              We use ML-KEM (Kyber), which is based on lattice problems. These problems are believed
              to be hard for both classical and quantum computers, providing long-term security for
              your data.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Can I use this for sensitive documents?">
            <p>
              This service is suitable for sharing sensitive documents with strong protection.
              However, for extremely sensitive data (classified information, medical records subject
              to HIPAA, etc.), you should consult with security professionals about compliance
              requirements.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Is the source code available?">
            <p>
              Yes! The entire codebase is open source and available for review. We believe in
              transparency and encourage security researchers to audit our implementation.
            </p>
          </CollapsibleSection>
        </div>
      </section>
    </div>
  )
}
