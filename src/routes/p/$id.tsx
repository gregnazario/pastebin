import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { FileEncryptionService, type UploadProgress } from '../../services/FileEncryptionService'
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

  const handleDownload = useCallback(() => {
    if (!decryptedFile) return

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
        <style>{styles}</style>
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
        <style>{styles}</style>
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

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .view-page {
    max-width: 500px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .view-page h1 {
    text-align: center;
    margin-bottom: 30px;
  }

  .security-warning {
    background: #fff8e6;
    border: 1px solid #f0c36d;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .warning-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    color: #8a6914;
    margin-bottom: 8px;
  }

  .dismiss-warning {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #8a6914;
    padding: 0;
    line-height: 1;
  }

  .security-warning p {
    margin: 0 0 8px 0;
    color: #5d4a0a;
    font-size: 14px;
  }

  .security-warning ul {
    margin: 0;
    padding-left: 20px;
    color: #5d4a0a;
    font-size: 13px;
  }

  .security-warning li {
    margin: 4px 0;
  }

  .error-box {
    background: #fdecea;
    border: 1px solid #e74c3c;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  .error-box h2 {
    color: #c0392b;
    margin-top: 0;
  }

  .decrypt-form p {
    text-align: center;
    color: #666;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .password-input {
    position: relative;
  }

  .password-input input {
    width: 100%;
    padding: 12px;
    padding-right: 50px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
  }

  .toggle-password {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
  }

  .error-message {
    background: #fdecea;
    border: 1px solid #e74c3c;
    padding: 12px;
    border-radius: 6px;
    color: #c0392b;
    margin-bottom: 20px;
  }

  .progress {
    margin-bottom: 20px;
  }

  .progress-bar {
    height: 8px;
    background: #2c3e50;
    border-radius: 4px;
    transition: width 0.3s;
  }

  .progress p {
    margin-top: 8px;
    color: #666;
    font-size: 14px;
  }

  .decrypt-button,
  .download-button {
    width: 100%;
    padding: 15px;
    background: #2c3e50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .decrypt-button:hover:not(:disabled),
  .download-button:hover {
    background: #1a252f;
  }

  .decrypt-button:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }

  .success {
    text-align: center;
  }

  .success h2 {
    color: #27ae60;
  }

  .file-details {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: left;
  }

  .file-details p {
    margin: 8px 0;
  }
`
