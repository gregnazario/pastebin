import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ClipboardIcon,
  DiceIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileIcon,
  FolderIcon,
} from '../components/Icons'
import { useToast } from '../components/Toast'
import type { UploadProgress } from '../services/FileEncryptionService'
import { PasswordValidator } from '../services/validation/PasswordValidator'

/** Maximum file size in bytes (100MB) - must match server limit */
const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / 1024 / 1024

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

/**
 * Generate a cryptographically secure random password
 * Uses characters that are easy to distinguish and type
 */
function generateSecurePassword(length = 20): string {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*'
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (num) => charset[num % charset.length]).join('')
}

function UploadPage() {
  const { showToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [encryptMetadata, setEncryptMetadata] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [result, setResult] = useState<{ url: string; expiresAt: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Memoize password validation to avoid recalculating on every render
  const passwordValidation = useMemo(() => PasswordValidator.validate(password), [password])
  const passwordsMatch = password === confirmPassword

  /**
   * Validate and set a file, shared between input change and drag-drop
   */
  const validateAndSetFile = useCallback((selectedFile: File) => {
    // Early file size validation to prevent wasted effort
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB.`,
      )
      setFile(null)
      return false
    }

    if (selectedFile.size === 0) {
      setError('Cannot upload empty files.')
      setFile(null)
      return false
    }

    setFile(selectedFile)
    setError(null)
    setResult(null)
    return true
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        if (!validateAndSetFile(selectedFile)) {
          // Clear the input so user can select again
          e.target.value = ''
        }
      }
    },
    [validateAndSetFile],
  )

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isUploading) {
        setIsDragOver(true)
      }
    },
    [isUploading],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (isUploading) return

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        validateAndSetFile(droppedFile)
      }
    },
    [isUploading, validateAndSetFile],
  )

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

  const copyToClipboard = useCallback(async () => {
    if (result?.url) {
      try {
        await navigator.clipboard.writeText(result.url)
        showToast('Link copied to clipboard!', 'success')
      } catch {
        showToast('Failed to copy to clipboard', 'error')
      }
    }
  }, [result?.url, showToast])

  const handleGeneratePassword = useCallback(() => {
    const newPassword = generateSecurePassword()
    setPassword(newPassword)
    setConfirmPassword(newPassword)
    setShowPassword(true) // Show the password so user can copy it
    showToast('Strong password generated! Make sure to save it.', 'info', 5000)
  }, [showToast])

  const copyPassword = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(password)
      showToast('Password copied to clipboard!', 'success')
    } catch {
      showToast('Failed to copy password', 'error')
    }
  }, [password, showToast])

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
            {/* biome-ignore lint/a11y/useSemanticElements: Drop zone needs to be a div for drag events, inner elements provide interactivity */}
            <div
              className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="region"
              aria-label="File drop zone"
            >
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                disabled={isUploading}
                className="file-input-hidden"
              />
              {file ? (
                <div className="drop-zone-content">
                  <span className="file-icon">
                    <FileIcon size={48} />
                  </span>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    className="change-file-btn"
                    onClick={() => document.getElementById('file-input')?.click()}
                    disabled={isUploading}
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <label htmlFor="file-input" className="drop-zone-content">
                  <span className="drop-icon">
                    {isDragOver ? <DownloadIcon size={48} /> : <FolderIcon size={48} />}
                  </span>
                  <p className="drop-text">
                    {isDragOver ? 'Drop file here' : 'Drag & drop a file here'}
                  </p>
                  <p className="drop-subtext">or click to browse</p>
                  <p className="drop-limit">Maximum size: {MAX_FILE_SIZE_MB}MB</p>
                </label>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password-input">Password</label>
            <div className="password-input-wrapper">
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
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              <div className="password-actions">
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="generate-password-btn"
                  disabled={isUploading}
                  title="Generate a strong password"
                >
                  <DiceIcon size={16} /> Generate
                </button>
                {password && (
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="copy-password-btn"
                    title="Copy password to clipboard"
                  >
                    <ClipboardIcon size={16} /> Copy
                  </button>
                )}
              </div>
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
