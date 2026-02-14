import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { createPasteHistoryEntry } from '../hooks/usePasteHistory'
import { getBrowserHistoryStorage } from '../services/history'
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
 * Generate a cryptographically secure random password.
 * Uses rejection sampling to avoid modulo bias in character selection.
 * Characters are chosen to be easy to distinguish and type (no l/1/I/0/O ambiguity).
 */
function generateSecurePassword(length = 20): string {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*'
  const charsetLen = charset.length
  // Calculate the largest multiple of charsetLen that fits in a Uint32
  // to implement rejection sampling and eliminate modulo bias
  const maxValid = Math.floor(0xffffffff / charsetLen) * charsetLen
  const result: string[] = []
  while (result.length < length) {
    const array = new Uint32Array(length - result.length)
    crypto.getRandomValues(array)
    for (const num of array) {
      if (num < maxValid && result.length < length) {
        result.push(charset[num % charsetLen])
      }
    }
  }
  return result.join('')
}

function UploadPage() {
  const { showToast } = useToast()
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
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [result, setResult] = useState<{ url: string; expiresAt: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showWeakPasswordModal, setShowWeakPasswordModal] = useState(false)
  const [weakPasswordAcknowledged, setWeakPasswordAcknowledged] = useState(false)

  // Memoize password validation to avoid recalculating on every render
  const passwordValidation = useMemo(() => PasswordValidator.validate(password), [password])
  const passwordsMatch = password === confirmPassword

  useEffect(() => {
    if (!showWeakPasswordModal) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowWeakPasswordModal(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showWeakPasswordModal])

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

  const handleUpload = useCallback(async (allowWeakPasswordOverride: boolean = false) => {
    const uploadFile = getUploadFile()
    if (!uploadFile || !password || !passwordsMatch) return

    const isWeakPassword = !passwordValidation.isValid
    if (isWeakPassword && !allowWeakPasswordOverride && !weakPasswordAcknowledged) {
      setShowWeakPasswordModal(true)
      return
    }

    const allowWeakPassword = isWeakPassword && (allowWeakPasswordOverride || weakPasswordAcknowledged)
    if (allowWeakPasswordOverride) {
      setWeakPasswordAcknowledged(true)
    }

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
        {
          allowWeakPassword,
        },
      )

      // Save to browser history
      try {
        const historyStorage = getBrowserHistoryStorage()
        if (historyStorage.isAvailable()) {
          // Get preview for notes (first 100 characters)
          const preview =
            uploadMode === 'note' && noteContent.length > 0
              ? noteContent.slice(0, 100) + (noteContent.length > 100 ? '...' : '')
              : undefined

          // Store full URL including decryption key
          // The key alone isn't enough - password is still required to decrypt
          const historyEntry = createPasteHistoryEntry({
            fileId: uploadResult.fileId,
            fileName: uploadFile.name,
            fileSize: uploadFile.size,
            mimeType: uploadFile.type || 'application/octet-stream',
            url: uploadResult.shareableUrl,
            expiresAt: uploadResult.expiresAt,
            encryptedMetadata: encryptMetadata,
            contentType: uploadMode,
            preview: encryptMetadata ? undefined : preview,
          })

          await historyStorage.add(historyEntry)
        }
      } catch (historyError) {
        // Don't fail the upload if history save fails
        console.warn('Failed to save to history:', historyError)
      }

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
  }, [
    getUploadFile,
    password,
    encryptMetadata,
    passwordValidation.isValid,
    weakPasswordAcknowledged,
    passwordsMatch,
    uploadMode,
    noteContent,
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
        <section className="result" aria-labelledby="upload-complete-heading">
          <h2 id="upload-complete-heading">
            <span aria-hidden="true">✅</span> Upload Complete!
          </h2>
          <p>Share this link (includes encryption key in URL fragment):</p>
          <div className="url-container">
            <label htmlFor="share-url" className="sr-only">Shareable link</label>
            <input id="share-url" type="text" readOnly value={result.url} aria-describedby="expires-info" />
            <button type="button" onClick={copyToClipboard} aria-label="Copy shareable link to clipboard">
              Copy
            </button>
          </div>
          <p className="expires" id="expires-info">Expires: {new Date(result.expiresAt).toLocaleDateString()}</p>
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setFile(null)
              setNoteContent('')
              setNoteTitle('')
              setPassword('')
              setConfirmPassword('')
            }}
          >
            {uploadMode === 'file' ? 'Upload Another File' : 'Create Another Note'}
          </button>
        </section>
      ) : (
        <form
          className="upload-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleUpload()
          }}
          aria-label={uploadMode === 'file' ? 'File upload form' : 'Note creation form'}
          noValidate
        >
          {/* Mode selector: toggle between file upload and note creation */}
          <fieldset className="mode-selector" aria-label="Upload mode">
            <legend className="sr-only">Choose upload mode</legend>
            <button
              type="button"
              className={`mode-btn ${uploadMode === 'file' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('file')}
              disabled={isUploading}
              aria-pressed={uploadMode === 'file'}
            >
              <FolderIcon size={16} aria-hidden /> File
            </button>
            <button
              type="button"
              className={`mode-btn ${uploadMode === 'note' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('note')}
              disabled={isUploading}
              aria-pressed={uploadMode === 'note'}
            >
              <NoteIcon size={16} aria-hidden /> Note
            </button>
          </fieldset>

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
                aria-label="File drop zone — drag and drop a file here or click to browse"
              >
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="file-input-hidden"
                  aria-describedby="file-size-limit"
                />
                {file ? (
                  <div className="drop-zone-content">
                    <span className="file-icon" aria-hidden="true">
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
                    <span className="drop-icon" aria-hidden="true">
                      {isDragOver ? <DownloadIcon size={48} /> : <FolderIcon size={48} />}
                    </span>
                    <p className="drop-text">
                      {isDragOver ? 'Drop file here' : 'Drag & drop a file here'}
                    </p>
                    <p className="drop-subtext">or click to browse</p>
                    <p className="drop-limit" id="file-size-limit">Maximum size: {MAX_FILE_SIZE_MB}MB</p>
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
                  autoComplete="off"
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
                  aria-describedby="note-char-count"
                  aria-required="true"
                />
                <div className="note-info" id="note-char-count" aria-live="polite">
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
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setWeakPasswordAcknowledged(false)
                  }}
                  placeholder="Enter a strong password"
                  disabled={isUploading}
                  aria-required="true"
                  aria-invalid={password ? !passwordValidation.isValid : undefined}
                  aria-describedby={
                    password && !passwordValidation.isValid ? 'password-errors' : undefined
                  }
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                  aria-label="Generate a strong random password"
                  title="Generate a strong password"
                >
                  <DiceIcon size={16} aria-hidden /> Generate
                </button>
                {password && (
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="copy-password-btn"
                    aria-label="Copy password to clipboard"
                    title="Copy password to clipboard"
                  >
                    <ClipboardIcon size={16} aria-hidden /> Copy
                  </button>
                )}
              </div>
            </div>
            {password && !passwordValidation.isValid && (
              <ul className="password-errors" id="password-errors" role="alert" aria-label="Password requirements not met">
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
              aria-required="true"
              aria-invalid={confirmPassword ? !passwordsMatch : undefined}
              aria-describedby={
                confirmPassword && !passwordsMatch ? 'password-mismatch-error' : undefined
              }
              autoComplete="new-password"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="error" id="password-mismatch-error" role="alert">
                Passwords do not match
              </p>
            )}
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

          {error && (
            <div className="error-message" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {progress && (
            <output className="progress" aria-label="Upload progress">
              <div
                className="progress-bar"
                style={{ width: `${progress.progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${Math.round(progress.progress)}% complete`}
              />
              <p aria-live="polite">{progress.message}</p>
            </output>
          )}

          <button
            type="submit"
            disabled={
              !hasContent ||
              !password ||
              !passwordsMatch ||
              isUploading ||
              (uploadMode === 'note' && !isNoteValid)
            }
            className="upload-button"
            aria-busy={isUploading}
          >
            {isUploading
              ? 'Encrypting...'
              : uploadMode === 'file'
                ? 'Encrypt & Upload'
                : 'Encrypt & Save Note'}
          </button>
        </form>
      )}

      {showWeakPasswordModal && (
        <div className="weak-password-modal-overlay">
          <button
            type="button"
            className="weak-password-modal-backdrop"
            onClick={() => setShowWeakPasswordModal(false)}
            aria-label="Close weak password warning"
          />
          <div
            className="weak-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="weak-password-modal-title"
            aria-describedby="weak-password-modal-description"
          >
            <h2 id="weak-password-modal-title">Weak Password Warning</h2>
            <p id="weak-password-modal-description">
              This password is simple and easier to guess. You can continue, but your file
              security may be significantly weaker.
            </p>
            <ul className="weak-password-modal-errors">
              {passwordValidation.errors.map((validationError, index) => (
                <li key={index}>{validationError}</li>
              ))}
            </ul>
            <div className="weak-password-modal-actions">
              <button
                type="button"
                className="weak-password-cancel-btn"
                onClick={() => setShowWeakPasswordModal(false)}
              >
                Choose Stronger Password
              </button>
              <button
                type="button"
                className="weak-password-continue-btn"
                onClick={() => {
                  setShowWeakPasswordModal(false)
                  void handleUpload(true)
                }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
