import React from 'react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="home-page">
      <h2>Welcome to Secure Pastebin</h2>
      <p>
        Share files securely using post-quantum encryption. Your files are encrypted locally
        in your browser before being uploaded.
      </p>
      <div className="actions">
        <Link to="/upload" className="button primary">
          Upload a File
        </Link>
      </div>
      <div className="features">
        <h3>Features</h3>
        <ul>
          <li>Post-quantum secure encryption (Kyber + AES-GCM)</li>
          <li>Client-side encryption - your data never leaves your browser unencrypted</li>
          <li>Password-based key derivation using Argon2</li>
          <li>Files up to 100MB supported</li>
          <li>Links expire after 24 hours</li>
        </ul>
      </div>
    </div>
  );
}