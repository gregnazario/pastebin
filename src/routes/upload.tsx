import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { FileEncryptionService, type UploadProgress } from '../services/FileEncryptionService'
import { PasswordValidator } from '../services/validation/PasswordValidator'

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

  const passwordValidation = PasswordValidator.validate(password)
  const passwordsMatch = password === confirmPassword

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
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
      const service = new FileEncryptionService()
      const uploadResult = await service.uploadFile(
        file,
        password,
        encryptMetadata,
        setProgress
      )

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
            <button onClick={copyToClipboard}>Copy</button>
          </div>
          <p className="expires">
            Expires: {new Date(result.expiresAt).toLocaleDateString()}
          </p>
          <button onClick={() => { setResult(null); setFile(null); setPassword(''); setConfirmPassword(''); }}>
            Upload Another File
          </button>
        </div>
      ) : (
        <div className="upload-form">
          <div className="form-group">
            <label>Select File</label>
            <input
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file && (
              <p className="file-info">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input">
              <input
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
            <label>Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isUploading}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="error">Passwords do not match</p>
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

          {error && <div className="error-message">{error}</div>}

          {progress && (
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progress.progress}%` }} />
              <p>{progress.message}</p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || !passwordValidation.isValid || !passwordsMatch || isUploading}
            className="upload-button"
          >
            {isUploading ? 'Uploading...' : 'Encrypt & Upload'}
          </button>
        </div>
      )}

      <style>{`
        .upload-page {
          max-width: 500px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .upload-page h1 {
          text-align: center;
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .form-group input[type="text"],
        .form-group input[type="password"],
        .form-group input[type="file"] {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
        }

        .password-input {
          position: relative;
        }

        .password-input input {
          padding-right: 50px;
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

        .checkbox label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox input {
          width: auto;
        }

        .file-info {
          margin-top: 8px;
          color: #666;
          font-size: 14px;
        }

        .password-errors {
          margin: 8px 0 0;
          padding-left: 20px;
          color: #e74c3c;
          font-size: 14px;
        }

        .error {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 4px;
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

        .upload-button {
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

        .upload-button:hover:not(:disabled) {
          background: #1a252f;
        }

        .upload-button:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .result {
          text-align: center;
        }

        .result h2 {
          color: #27ae60;
        }

        .url-container {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .url-container input {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .url-container button {
          padding: 12px 20px;
          background: #2c3e50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .expires {
          color: #666;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
