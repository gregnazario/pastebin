import React, { useState } from 'react';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [encryptMetadata, setEncryptMetadata] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !password) {
      alert('Please select a file and enter a password');
      return;
    }
    // TODO: Implement upload logic
    console.log('Upload file:', file.name, 'with metadata encryption:', encryptMetadata);
  };

  return (
    <div className="upload-page">
      <h2>Upload a File</h2>
      <div className="upload-form">
        <div className="form-group">
          <label htmlFor="file-input">Select File (max 100MB)</label>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            accept="*/*"
          />
          {file && (
            <p className="file-info">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a strong password"
          />
          <p className="help-text">
            Minimum 12 characters with uppercase, lowercase, numbers, and special characters
          </p>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={encryptMetadata}
              onChange={(e) => setEncryptMetadata(e.target.checked)}
            />
            Encrypt metadata (filename, size)
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || !password}
          className="button primary"
        >
          Encrypt and Upload
        </button>
      </div>
    </div>
  );
}