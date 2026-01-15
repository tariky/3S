import { LoginForm } from "@/components/login-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
});

function RouteComponent() {
  const { redirect } = Route.useSearch();

  return (
    <div className="min-h-svh bg-background">
      {/* Back to home link */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Nazad na shop</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <Link to="/" className="mb-8">
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Lunatik</span>
          </div>
        </Link>

        {/* Card */}
        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <LoginForm redirectTo={redirect} />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prijavom prihvatate naše{" "}
          <Link to="/page/uslovi-koristenja" className="underline hover:text-foreground">
            Uslove korištenja
          </Link>{" "}
          i{" "}
          <Link to="/page/politika-privatnosti" className="underline hover:text-foreground">
            Politiku privatnosti
          </Link>
        </p>
      </div>
    </div>
  );
}
