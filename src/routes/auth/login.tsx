import { LoginForm } from '@/components/login-form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    }
  },
})

function RouteComponent() {
  const { redirect } = Route.useSearch()
  
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gray-50">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirect} />
      </div>
    </div>
  )
}
