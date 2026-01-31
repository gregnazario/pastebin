import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { HomePage } from './pages/HomePage';
import { UploadPage } from './pages/UploadPage';
import { ViewPage } from './pages/ViewPage';

export function App() {
  const isDevelopment = import.meta.env.DEV;

  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <h1>Secure Pastebin</h1>
          <p>Share files securely with post-quantum encryption</p>
          {isDevelopment && (
            <nav className="dev-nav">
              <Link to="/">Home</Link>
              <Link to="/upload">Upload</Link>
              <Link to="/benchmark">Benchmarks</Link>
            </nav>
          )}
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/p/:id" element={<ViewPage />} />
            {isDevelopment && <Route path="/benchmark" element={<BenchmarkPage />} />}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
