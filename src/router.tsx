import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import { Link } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Default 404 component
function DefaultNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">404</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Stranica nije pronađena
        </h1>
        <p className="text-gray-600 mb-8">
          Stranica koju tražite ne postoji ili je uklonjena.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Nazad na početnu
        </Link>
      </div>
    </div>
  )
}

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext()

  const router = createRouter({
    routeTree,
    context: { ...rqContext },
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultNotFoundComponent: DefaultNotFound,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient })

  return router
}
