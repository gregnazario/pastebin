import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export function ViewPage() {
  const { id } = useParams<{ id: string }>();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a key in the URL fragment
    const fragment = window.location.hash.substring(1);
    if (fragment) {
      // TODO: Use fragment as derived key
      console.log('Found key in URL fragment');
    }
  }, []);

  const handleDownload = async () => {
    if (!password && !window.location.hash) {
      alert('Please enter a password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Implement download and decryption logic
      console.log('Download file with ID:', id);
    } catch (err) {
      setError('Failed to decrypt file. Please check your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="view-page">
      <h2>Access File</h2>
      <p>File ID: {id}</p>
      
      {!window.location.hash && (
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter the file password"
          />
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button
        onClick={handleDownload}
        disabled={isLoading || (!password && !window.location.hash)}
        className="button primary"
      >
        {isLoading ? 'Decrypting...' : 'Download and Decrypt'}
      </button>
    </div>
  );
}