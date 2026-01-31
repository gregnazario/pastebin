import { HeadContent, Outlet, Scripts, createRootRoute, Link } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Secure Pastebin - Post-Quantum Encrypted File Sharing' },
      { name: 'description', content: 'Share files securely with post-quantum encryption' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style>{globalStyles}</style>
      </head>
      <body>
        <header className="app-header">
          <div className="header-content">
            <Link to="/" className="logo">
              🔐 Secure Pastebin
            </Link>
            <nav>
              <Link to="/">Home</Link>
              <Link to="/upload">Upload</Link>
            </nav>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  )
}

const globalStyles = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    color: #333;
  }

  .app-header {
    background: #2c3e50;
    color: white;
    padding: 15px 20px;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.3rem;
    font-weight: bold;
    color: white;
    text-decoration: none;
  }

  nav {
    display: flex;
    gap: 20px;
  }

  nav a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    transition: color 0.2s;
  }

  nav a:hover,
  nav a[data-status="active"] {
    color: white;
  }

  main {
    min-height: calc(100vh - 60px);
  }
`
