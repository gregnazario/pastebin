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
  NoteIcon,
} from '../components/Icons'
import { useToast } from '../components/Toast'
import { useKeychain } from '../hooks/useKeychain'
import type { UploadProgress } from '../services/FileEncryptionService'
import { PasswordValidator } from '../services/validation/PasswordValidator'

/** Maximum file size in bytes (100MB) - must match server limit */
const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / 1024 / 1024

/** Maximum note size in characters (approximately 10MB of text) */
const MAX_NOTE_SIZE = 10 * 1024 * 1024

/** Upload mode: either file or note (text) */
type UploadMode = 'file' | 'note'

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
  const keychain = useKeychain()
  // Upload mode: 'file' for file upload, 'note' for text input
  const [uploadMode, setUploadMode] = useState<UploadMode>('file')
  const [file, setFile] = useState<File | null>(null)
  // Note content and title for text mode
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [encryptMetadata, setEncryptMetadata] = useState(false)
  const [saveToKeychain, setSaveToKeychain] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [result, setResult] = useState<{ url: string; expiresAt: number; pasteId?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Memoize password validation to avoid recalculating on every render
  const passwordValidation = useMemo(() => PasswordValidator.validate(password), [password])
  const passwordsMatch = password === confirmPassword

  /**
   * Check if note content is valid
   */
  const isNoteValid = useMemo(() => {
    if (uploadMode !== 'note') return true
    return noteContent.trim().length > 0 && noteContent.length <= MAX_NOTE_SIZE
  }, [uploadMode, noteContent])

  /**
   * Get the file to upload - either the selected file or a generated note file
   */
  const getUploadFile = useCallback((): File | null => {
    if (uploadMode === 'file') {
      return file
    }

    if (!noteContent.trim()) {
      return null
    }

    // Create a File from the note content
    const blob = new Blob([noteContent], { type: 'text/plain' })
    const filename = noteTitle.trim() || 'note.txt'
    // Ensure filename has .txt extension if not already
    const finalFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`
    return new File([blob], finalFilename, { type: 'text/plain' })
  }, [uploadMode, file, noteContent, noteTitle])

  /**
   * Check if content is ready for upload
   */
  const hasContent = useMemo(() => {
    if (uploadMode === 'file') {
      return file !== null
    }
    return noteContent.trim().length > 0
  }, [uploadMode, file, noteContent])

  /**
   * Handle mode switch - clears content when switching modes
   */
  const handleModeSwitch = useCallback((mode: UploadMode) => {
    setUploadMode(mode)
    setError(null)
    setResult(null)
    // Reset content when switching modes
    if (mode === 'file') {
      setNoteContent('')
      setNoteTitle('')
    } else {
      setFile(null)
    }
  }, [])

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
    const uploadFile = getUploadFile()
    if (!uploadFile || !passwordValidation.isValid || !passwordsMatch) return

    // Validate note size
    if (uploadMode === 'note' && noteContent.length > MAX_NOTE_SIZE) {
      setError(`Note is too large. Maximum size is ${MAX_NOTE_SIZE / 1024 / 1024}MB.`)
      return
    }

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      // Dynamic import - only load crypto libraries when actually uploading
      const { FileEncryptionService } = await import('../services/FileEncryptionService')
      const service = new FileEncryptionService()
      const uploadResult = await service.uploadFile(
        uploadFile,
        password,
        encryptMetadata,
        setProgress,
      )

      // Extract paste ID from the shareable URL (format: /p/{id}#key)
      const urlMatch = uploadResult.shareableUrl.match(/\/p\/([^#]+)/)
      const pasteId = urlMatch?.[1]

      // Save to keychain if requested and available
      if (saveToKeychain && keychain.isAvailable && pasteId) {
        const keychainResult = await keychain.save({
          id: pasteId,
          password: password,
          label: uploadFile.name,
          url: uploadResult.shareableUrl,
          createdAt: Date.now(),
          expiresAt: uploadResult.expiresAt,
        }, { overwrite: true })

        if (keychainResult.success) {
          showToast('Password saved to keychain!', 'success')
        } else if (!keychainResult.userCancelled) {
          showToast('Could not save password to keychain', 'warning')
        }
      }

      setResult({
        url: uploadResult.shareableUrl,
        expiresAt: uploadResult.expiresAt,
        pasteId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setProgress(null)
    }
  }, [
    getUploadFile,
    password,
    encryptMetadata,
    passwordValidation.isValid,
    passwordsMatch,
    uploadMode,
    noteContent.length,
    saveToKeychain,
    keychain,
    showToast,
  ])

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
      <h1>{uploadMode === 'file' ? 'Upload a File' : 'Create a Note'}</h1>

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
              setNoteContent('')
              setNoteTitle('')
              setPassword('')
              setConfirmPassword('')
              setSaveToKeychain(false)
            }}
          >
            {uploadMode === 'file' ? 'Upload Another File' : 'Create Another Note'}
          </button>
        </div>
      ) : (
        <div className="upload-form">
          {/* Mode Selector */}
          <div className="mode-selector">
            <button
              type="button"
              className={`mode-btn ${uploadMode === 'file' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('file')}
              disabled={isUploading}
            >
              <FolderIcon size={16} /> File
            </button>
            <button
              type="button"
              className={`mode-btn ${uploadMode === 'note' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('note')}
              disabled={isUploading}
            >
              <NoteIcon size={16} /> Note
            </button>
          </div>

          {uploadMode === 'file' ? (
            /* File Upload Mode */
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
          ) : (
            /* Note Input Mode */
            <div className="note-editor">
              <div className="form-group">
                <label htmlFor="note-title">Title (optional)</label>
                <input
                  id="note-title"
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="my-note.txt"
                  disabled={isUploading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="note-content">Content</label>
                <textarea
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note content here..."
                  disabled={isUploading}
                  rows={10}
                  className="note-textarea"
                />
                <div className="note-info">
                  <span className="note-size">
                    {noteContent.length.toLocaleString()} / {MAX_NOTE_SIZE.toLocaleString()}{' '}
                    characters
                  </span>
                  {noteContent.length > 0 && (
                    <span className="note-size-kb">
                      (~{(new Blob([noteContent]).size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

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

          {keychain.isAvailable && (
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={saveToKeychain}
                  onChange={(e) => setSaveToKeychain(e.target.checked)}
                  disabled={isUploading}
                />
                Save password to {keychain.providerName || 'keychain'}
              </label>
              <p className="checkbox-hint">
                Saves the password securely so you can auto-fill it later
              </p>
            </div>
          )}

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
            disabled={
              !hasContent ||
              !passwordValidation.isValid ||
              !passwordsMatch ||
              isUploading ||
              (uploadMode === 'note' && !isNoteValid)
            }
            className="upload-button"
          >
            {isUploading
              ? 'Encrypting...'
              : uploadMode === 'file'
                ? 'Encrypt & Upload'
                : 'Encrypt & Save Note'}
          </button>
        </div>
      )}
    </div>
  )
}
