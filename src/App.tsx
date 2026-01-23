import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { UploadPage } from './pages/UploadPage';
import { ViewPage } from './pages/ViewPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <h1>Secure Pastebin</h1>
          <p>Share files securely with post-quantum encryption</p>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/p/:id" element={<ViewPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}