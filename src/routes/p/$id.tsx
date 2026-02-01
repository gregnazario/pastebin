import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertIcon, CheckIcon, EyeIcon, EyeOffIcon } from '../../components/Icons'
import { useKeychainEntry } from '../../hooks/useKeychain'
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

/**
 * Check if a file is previewable as text
 */
function isTextFile(mimeType: string, fileName: string): boolean {
  const textMimeTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'text/markdown',
    'text/xml',
    'text/csv',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/x-yaml',
    'application/yaml',
  ]

  const textExtensions = [
    '.txt',
    '.md',
    '.json',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.css',
    '.html',
    '.xml',
    '.yaml',
    '.yml',
    '.csv',
    '.py',
    '.rb',
    '.go',
    '.rs',
    '.java',
    '.c',
    '.cpp',
    '.h',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.ps1',
    '.sql',
    '.graphql',
    '.toml',
    '.ini',
    '.conf',
    '.cfg',
    '.env',
    '.gitignore',
    '.dockerfile',
    '.makefile',
  ]

  const lowerName = fileName.toLowerCase()
  return (
    textMimeTypes.some((t) => mimeType.startsWith(t)) ||
    textExtensions.some((ext) => lowerName.endsWith(ext))
  )
}

/**
 * Check if a file is previewable as an image
 */
function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg')
}

/** Maximum size for text preview (500KB) */
const MAX_TEXT_PREVIEW_SIZE = 500 * 1024

/** Maximum size for image preview (10MB) */
const MAX_IMAGE_PREVIEW_SIZE = 10 * 1024 * 1024

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
  const [showPreview, setShowPreview] = useState(false)

  // Keychain integration - check if we have the password saved
  const keychainEntry = useKeychainEntry(id, false) // Don't auto-retrieve for security

  // Determine if the file can be previewed
  const previewInfo = useMemo(() => {
    if (!decryptedFile) return null

    const { metadata, data } = decryptedFile
    const isText = isTextFile(metadata.mimeType, metadata.name)
    const isImage = isImageFile(metadata.mimeType)

    if (isText && data.length <= MAX_TEXT_PREVIEW_SIZE) {
      return { type: 'text' as const, canPreview: true }
    }
    if (isImage && data.length <= MAX_IMAGE_PREVIEW_SIZE) {
      return { type: 'image' as const, canPreview: true }
    }
    if (isText && data.length > MAX_TEXT_PREVIEW_SIZE) {
      return { type: 'text' as const, canPreview: false, reason: 'File too large to preview' }
    }
    if (isImage && data.length > MAX_IMAGE_PREVIEW_SIZE) {
      return { type: 'image' as const, canPreview: false, reason: 'Image too large to preview' }
    }
    return null
  }, [decryptedFile])

  // Generate preview content
  const previewContent = useMemo(() => {
    if (!decryptedFile || !previewInfo?.canPreview || !showPreview) return null

    const { data, metadata } = decryptedFile

    if (previewInfo.type === 'text') {
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(data)
    }

    if (previewInfo.type === 'image') {
      // Create a new Uint8Array to ensure proper BlobPart compatibility
      const blob = new Blob([new Uint8Array(data)], { type: metadata.mimeType })
      return URL.createObjectURL(blob)
    }

    return null
  }, [decryptedFile, previewInfo, showPreview])

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (previewContent && previewInfo?.type === 'image') {
        URL.revokeObjectURL(previewContent)
      }
    }
  }, [previewContent, previewInfo?.type])

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
            The file link appears to be malformed or invalid. Please check that you have the correct
            link.
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
            <span>
              <AlertIcon size="1em" /> Security Notice
            </span>
            <button
              type="button"
              onClick={() => setShowSecurityWarning(false)}
              className="dismiss-warning"
              aria-label="Dismiss warning"
            >
              ×
            </button>
          </div>
          <p>This link contains a decryption key in the URL fragment. For security:</p>
          <ul>
            <li>Clear your browser history after accessing this file</li>
            <li>Use private/incognito mode for sensitive files</li>
            <li>Don't share screenshots of this page</li>
          </ul>
        </div>
      )}

      {decryptedFile ? (
        <div className="success">
          <h2>
            <CheckIcon size="1em" /> Decryption Successful!
          </h2>
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

          {/* Preview toggle */}
          {previewInfo && (
            <div className="preview-section">
              {previewInfo.canPreview ? (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="preview-toggle-btn"
                >
                  {showPreview ? (
                    <>
                      <EyeOffIcon size={16} /> Hide Preview
                    </>
                  ) : (
                    <>
                      <EyeIcon size={16} /> Preview{' '}
                      {previewInfo.type === 'image' ? 'Image' : 'File'}
                    </>
                  )}
                </button>
              ) : (
                <p className="preview-unavailable">{previewInfo.reason}</p>
              )}

              {/* Preview content */}
              {showPreview && previewContent && (
                <div className="preview-container">
                  {previewInfo.type === 'text' && (
                    <pre className="text-preview">
                      <code>{previewContent}</code>
                    </pre>
                  )}
                  {previewInfo.type === 'image' && (
                    <img
                      src={previewContent}
                      alt={decryptedFile.metadata.name}
                      className="image-preview"
                    />
                  )}
                </div>
              )}
            </div>
          )}

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
                disabled={isLoading || keychainEntry.isLoading}
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
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>

            {/* Keychain auto-fill button */}
            {!keychainEntry.entry && !password && (
              <button
                type="button"
                className="keychain-fill-btn"
                onClick={async () => {
                  await keychainEntry.retrieve()
                  if (keychainEntry.entry) {
                    setPassword(keychainEntry.entry.password)
                  }
                }}
                disabled={isLoading || keychainEntry.isLoading}
              >
                {keychainEntry.isLoading ? '🔄 Checking keychain...' : '🔑 Fill from keychain'}
              </button>
            )}

            {keychainEntry.entry && !password && (
              <div className="keychain-found">
                <p>
                  🔑 Password found in keychain
                  {keychainEntry.entry.label && ` for "${keychainEntry.entry.label}"`}
                </p>
                <button
                  type="button"
                  className="use-keychain-btn"
                  onClick={() => {
                    if (keychainEntry.entry) {
                      setPassword(keychainEntry.entry.password)
                    }
                  }}
                  disabled={isLoading}
                >
                  Use saved password
                </button>
              </div>
            )}
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
