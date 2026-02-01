import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import type { UploadProgress } from '../services/FileEncryptionService'
import { PasswordValidator } from '../services/validation/PasswordValidator'

/** Maximum file size in bytes (100MB) - must match server limit */
const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / 1024 / 1024

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [encryptMetadata, setEncryptMetadata] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [result, setResult] = useState<{ url: string; expiresAt: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Memoize password validation to avoid recalculating on every render
  const passwordValidation = useMemo(
    () => PasswordValidator.validate(password),
    [password]
  )
  const passwordsMatch = password === confirmPassword

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Early file size validation to prevent wasted effort
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB.`)
        setFile(null)
        // Clear the input so user can select again
        e.target.value = ''
        return
      }

      if (selectedFile.size === 0) {
        setError('Cannot upload empty files.')
        setFile(null)
        e.target.value = ''
        return
      }

      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file || !passwordValidation.isValid || !passwordsMatch) return

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      // Dynamic import - only load crypto libraries when actually uploading
      const { FileEncryptionService } = await import('../services/FileEncryptionService')
      const service = new FileEncryptionService()
      const uploadResult = await service.uploadFile(file, password, encryptMetadata, setProgress)

      setResult({
        url: uploadResult.shareableUrl,
        expiresAt: uploadResult.expiresAt,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setProgress(null)
    }
  }, [file, password, encryptMetadata, passwordValidation.isValid, passwordsMatch])

  const copyToClipboard = useCallback(() => {
    if (result?.url) {
      navigator.clipboard.writeText(result.url)
    }
  }, [result?.url])

  return (
    <div className="upload-page">
      <h1>Upload a File</h1>

      {result ? (
        <div className="result">
          <h2>✅ Upload Complete!</h2>
          <p>Share this link (includes encryption key in URL fragment):</p>
          <div className="url-container">
            <input type="text" readOnly value={result.url} />
            <button type="button" onClick={copyToClipboard}>
              Copy
            </button>
          </div>
          <p className="expires">Expires: {new Date(result.expiresAt).toLocaleDateString()}</p>
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setFile(null)
              setPassword('')
              setConfirmPassword('')
            }}
          >
            Upload Another File
          </button>
        </div>
      ) : (
        <div className="upload-form">
          <div className="form-group">
            <label htmlFor="file-input">Select File</label>
            <input id="file-input" type="file" onChange={handleFileChange} disabled={isUploading} />
            {file && (
              <p className="file-info">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password-input">Password</label>
            <div className="password-input">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {password && !passwordValidation.isValid && (
              <ul className="password-errors">
                {passwordValidation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isUploading}
            />
            {confirmPassword && !passwordsMatch && <p className="error">Passwords do not match</p>}
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={encryptMetadata}
                onChange={(e) => setEncryptMetadata(e.target.checked)}
                disabled={isUploading}
              />
              Encrypt filename and metadata
            </label>
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
            onClick={handleUpload}
            disabled={!file || !passwordValidation.isValid || !passwordsMatch || isUploading}
            className="upload-button"
          >
            {isUploading ? 'Uploading...' : 'Encrypt & Upload'}
          </button>
        </div>
      )}

    </div>
  )
}
