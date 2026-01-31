import type React from 'react';
import { useState } from 'react';
import { config } from '../config';
import {
  type EncryptedUploadResult,
  FileEncryptionService,
  type UploadProgress,
} from '../services/FileEncryptionService';
import { PasswordValidator } from '../services/validation/PasswordValidator';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [encryptMetadata, setEncryptMetadata] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<EncryptedUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const fileEncryptionService = new FileEncryptionService();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size
      if (selectedFile.size > config.app.maxFileSize) {
        const maxSizeMB = config.app.maxFileSize / 1024 / 1024;
        setError(`File too large. Maximum size is ${maxSizeMB}MB`);
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const validatePassword = (value: string) => {
    const validation = PasswordValidator.validate(value);
    setPasswordErrors(validation.errors);
    return validation;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value) {
      validatePassword(value);
    } else {
      setPasswordErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!file || !password) {
      setError('Please select a file and enter a password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError('Please fix password errors before uploading');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(null);

    try {
      const result = await fileEncryptionService.uploadFile(
        file,
        password,
        encryptMetadata,
        (progress) => setUploadProgress(progress),
      );

      setUploadResult(result);

      // Clear sensitive data
      setPassword('');
      setConfirmPassword('');
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (uploadResult) {
    return (
      <div className="upload-page">
        <h2>Upload Complete!</h2>
        <div className="upload-result">
          <div className="success-message">
            <p>Your file has been encrypted and uploaded successfully.</p>
            <p>The link will expire in {config.app.linkExpiryHours} hours.</p>
          </div>

          <div className="form-group">
            <label>Shareable Link:</label>
            <div className="link-container">
              <input
                type="text"
                value={uploadResult.shareableUrl}
                readOnly
                onClick={(e) => e.currentTarget.select()}
              />
              <button onClick={() => copyToClipboard(uploadResult.shareableUrl)} className="button">
                Copy
              </button>
            </div>
            <p className="help-text">
              Share this link with the recipient. They will need the password to decrypt the file.
            </p>
          </div>

          <div className="actions">
            <button
              onClick={() => {
                setUploadResult(null);
                setUploadProgress(null);
              }}
              className="button primary"
            >
              Upload Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <h2>Upload a File</h2>

      {error && <div className="error">{error}</div>}

      {uploadProgress && (
        <div className="upload-progress">
          <p>{uploadProgress.message}</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress.progress}%` }} />
          </div>
        </div>
      )}

      <div className="upload-form">
        <div className="form-group">
          <label htmlFor="file-input">Select File (max 100MB)</label>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            accept="*/*"
            disabled={isUploading}
          />
          {file && (
            <p className="file-info">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter a strong password"
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {passwordErrors.length > 0 && (
            <ul className="password-errors">
              {passwordErrors.map((error, index) => (
                <li key={index} className="error-item">
                  {error}
                </li>
              ))}
            </ul>
          )}
          <p className="help-text">
            Minimum 12 characters with uppercase, lowercase, numbers, and special characters
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            disabled={isUploading}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={encryptMetadata}
              onChange={(e) => setEncryptMetadata(e.target.checked)}
              disabled={isUploading}
            />
            Encrypt metadata (filename, size)
          </label>
          <p className="help-text">
            If unchecked, filename and size will be visible without the password
          </p>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || !password || !confirmPassword || isUploading}
          className="button primary"
        >
          {isUploading ? 'Uploading...' : 'Encrypt and Upload'}
        </button>
      </div>
    </div>
  );
}
