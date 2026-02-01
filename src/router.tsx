import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},

    scrollRestoration: true,
    // Cache preloaded data for 30 seconds
    defaultPreloadStaleTime: 30_000,
    // Preload routes on hover for faster navigation
    defaultPreload: 'intent',
    // Don't preload on viewport (saves bandwidth)
    defaultPreloadDelay: 100,
  })

  return router
}
