import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import type { UploadProgress } from '../../services/FileEncryptionService'
import type { FileMetadata } from '../../types'

/**
 * Validate file ID format to prevent injection attacks
 * File IDs should match: pastebin-timestamp-sanitized_filename-randomsuffix
 */
function isValidFileId(id: string): boolean {
  const pattern = /^pastebin-\d+-[\w._-]+-[a-f0-9]+$/
  return pattern.test(id) && id.length <= 500
}

export const Route = createFileRoute('/p/$id')({
  component: ViewPage,
})

function ViewPage() {
  const { id } = Route.useParams()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [decryptedFile, setDecryptedFile] = useState<{
    data: Uint8Array
    metadata: FileMetadata
  } | null>(null)
  const [showSecurityWarning, setShowSecurityWarning] = useState(true)

  // Validate file ID format
  const isIdValid = isValidFileId(id)

  // Get private key from URL fragment
  const [privateKey, setPrivateKey] = useState<string | null>(null)

  useEffect(() => {
    // Get the fragment after the hash
    const hash = window.location.hash.slice(1)
    if (hash) {
      setPrivateKey(hash)
    }
  }, [])

  const handleDecrypt = useCallback(async () => {
    if (!password || !privateKey) return

    setIsLoading(true)
    setError(null)

    try {
      // Dynamic import - only load crypto libraries when actually decrypting
      const { FileEncryptionService } = await import('../../services/FileEncryptionService')
      const service = new FileEncryptionService()
      const result = await service.downloadFile(id, password, privateKey, setProgress)

      setDecryptedFile(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed')
    } finally {
      setIsLoading(false)
      setProgress(null)
    }
  }, [id, password, privateKey])

  const handleDownload = useCallback(async () => {
    if (!decryptedFile) return

    // Dynamic import for download utilities
    const { FileEncryptionService } = await import('../../services/FileEncryptionService')
    const blob = FileEncryptionService.createDownloadableFile(
      decryptedFile.data,
      decryptedFile.metadata,
    )
    FileEncryptionService.triggerDownload(blob, decryptedFile.metadata.name)
  }, [decryptedFile])

  // Show error for invalid file ID format
  if (!isIdValid) {
    return (
      <div className="view-page">
        <div className="error-box">
          <h2>Invalid File Link</h2>
          <p>
            The file link appears to be malformed or invalid. Please check that you have the
            correct link.
          </p>
        </div>
      </div>
    )
  }

  if (!privateKey) {
    return (
      <div className="view-page">
        <div className="error-box">
          <h2>Missing Decryption Key</h2>
          <p>
            The decryption key is missing from the URL. Make sure you're using the complete
            shareable link that includes the key after the # symbol.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-page">
      <h1>Download File</h1>

      {/* Security warning about browser history */}
      {showSecurityWarning && !decryptedFile && (
        <div className="security-warning">
          <div className="warning-header">
            <span>⚠️ Security Notice</span>
            <button
              type="button"
              onClick={() => setShowSecurityWarning(false)}
              className="dismiss-warning"
              aria-label="Dismiss warning"
            >
              ×
            </button>
          </div>
          <p>
            This link contains a decryption key in the URL fragment. For security:
          </p>
          <ul>
            <li>Clear your browser history after accessing this file</li>
            <li>Use private/incognito mode for sensitive files</li>
            <li>Don't share screenshots of this page</li>
          </ul>
        </div>
      )}

      {decryptedFile ? (
        <div className="success">
          <h2>✅ Decryption Successful!</h2>
          <div className="file-details">
            <p>
              <strong>Filename:</strong> {decryptedFile.metadata.name}
            </p>
            <p>
              <strong>Size:</strong> {(decryptedFile.metadata.size / 1024).toFixed(2)} KB
            </p>
            <p>
              <strong>Type:</strong> {decryptedFile.metadata.mimeType}
            </p>
          </div>
          <button type="button" onClick={handleDownload} className="download-button">
            Download File
          </button>
        </div>
      ) : (
        <div className="decrypt-form">
          <p>Enter the password to decrypt this file:</p>

          <div className="form-group">
            <label htmlFor="decrypt-password">Password</label>
            <div className="password-input">
              <input
                id="decrypt-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) {
                    handleDecrypt()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {progress && (
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progress.progress}%` }} />
              <p>{progress.message}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleDecrypt}
            disabled={!password || isLoading}
            className="decrypt-button"
          >
            {isLoading ? 'Decrypting...' : 'Decrypt File'}
          </button>
        </div>
      )}
    </div>
  )
}
