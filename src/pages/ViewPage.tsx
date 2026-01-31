import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileEncryptionService, type UploadProgress } from '../services/FileEncryptionService';
import type { FileMetadata } from '../types';
import '../view-page.css';

export function ViewPage() {
  const { id } = useParams<{ id: string }>();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKeyFragment, setPrivateKeyFragment] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<UploadProgress | null>(null);
  const [decryptedFile, setDecryptedFile] = useState<{
    data: Uint8Array;
    metadata: FileMetadata;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fileEncryptionService = new FileEncryptionService();

  useEffect(() => {
    // Check if there's a key in the URL fragment
    const fragment = window.location.hash.substring(1);
    if (fragment) {
      setPrivateKeyFragment(fragment);
    }
  }, []);

  const handleDownload = async () => {
    if (!password) {
      setError('Please enter a password');
      return;
    }

    if (!privateKeyFragment) {
      setError('Missing decryption key. Please check your link.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDownloadProgress(null);

    try {
      const result = await fileEncryptionService.downloadFile(
        id!,
        password,
        privateKeyFragment,
        (progress) => setDownloadProgress(progress),
      );

      setDecryptedFile(result);

      // Automatically trigger download
      const blob = FileEncryptionService.createDownloadableFile(result.data, result.metadata);
      FileEncryptionService.triggerDownload(blob, result.metadata.name);

      // Clear password for security
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decrypt file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAgain = () => {
    if (decryptedFile) {
      const blob = FileEncryptionService.createDownloadableFile(
        decryptedFile.data,
        decryptedFile.metadata,
      );
      FileEncryptionService.triggerDownload(blob, decryptedFile.metadata.name);
    }
  };

  return (
    <div className="view-page">
      <h2>Access File</h2>

      {!privateKeyFragment ? (
        <div className="error">
          <p>Invalid link - missing decryption key</p>
          <p>Please use the complete link that was shared with you.</p>
        </div>
      ) : (
        <>
          <div className="file-access-info">
            <p>
              File ID: <code>{id}</code>
            </p>
            {decryptedFile && (
              <div className="file-details">
                <h3>File Information:</h3>
                <ul>
                  <li>
                    <strong>Name:</strong> {decryptedFile.metadata.name}
                  </li>
                  <li>
                    <strong>Size:</strong> {(decryptedFile.metadata.size / 1024 / 1024).toFixed(2)}{' '}
                    MB
                  </li>
                  <li>
                    <strong>Type:</strong> {decryptedFile.metadata.mimeType}
                  </li>
                  <li>
                    <strong>Uploaded:</strong>{' '}
                    {new Date(decryptedFile.metadata.uploadDate).toLocaleString()}
                  </li>
                  {decryptedFile.metadata.expirationDate && (
                    <li>
                      <strong>Expires:</strong>{' '}
                      {new Date(decryptedFile.metadata.expirationDate).toLocaleString()}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          {downloadProgress && (
            <div className="upload-progress">
              <p>{downloadProgress.message}</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${downloadProgress.progress}%` }} />
              </div>
            </div>
          )}

          {!decryptedFile ? (
            <>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the file password"
                    disabled={isLoading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleDownload();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="help-text">Enter the password that was used to encrypt this file</p>
              </div>

              <button
                onClick={handleDownload}
                disabled={isLoading || !password}
                className="button primary"
              >
                {isLoading ? 'Decrypting...' : 'Download and Decrypt'}
              </button>
            </>
          ) : (
            <div className="download-success">
              <p className="success-message">✓ File decrypted successfully!</p>
              <p>Your download should start automatically. If not:</p>
              <button onClick={handleDownloadAgain} className="button primary">
                Download Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
