import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle2, ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { z } from "zod";
import { cn } from "@/lib/utils";

const passwordSchema = z.object({
  password: z.string().min(8, "Lozinka mora biti najmanje 8 karaktera"),
  confirmPassword: z.string().min(8, "Potvrda lozinke mora biti najmanje 8 karaktera"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Lozinke se ne poklapaju",
  path: ["confirmPassword"],
});

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
    };
  },
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If no token, show error state
  if (!token) {
    return (
      <div className="min-h-svh bg-background">
        <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
          <Link to="/" className="mb-8">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">L</span>
              </div>
              <span className="text-xl font-semibold text-foreground">Lunatik</span>
            </div>
          </Link>

          <div className="w-full max-w-[400px]">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
              <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="size-6 text-destructive" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Nevažeći link
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Link za resetovanje lozinke je nevažeći ili je istekao.
              </p>
              <div className="mt-6">
                <Link to="/auth/forgot-password">
                  <Button className="w-full">
                    Zatraži novi link
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate passwords
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const errors: { password?: string; confirmPassword?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === "password") {
          errors.password = err.message;
        } else if (err.path[0] === "confirmPassword") {
          errors.confirmPassword = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        if (result.error.code === "INVALID_TOKEN") {
          setError("Link za resetovanje je istekao ili je nevažeći. Zatražite novi link.");
        } else {
          setError(result.error.message || "Greška pri resetovanju lozinke");
        }
        return;
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate({ to: "/auth/login" });
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Greška pri resetovanju lozinke. Pokušajte ponovo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-svh bg-background">
      {/* Back to login link */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Nazad na prijavu</span>
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
            {success ? (
              /* Success State */
              <div className="text-center">
                <div className="mx-auto size-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Lozinka promijenjena!
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Vaša lozinka je uspješno promijenjena. Možete se sada prijaviti sa novom lozinkom.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Preusmjeravanje na prijavu...
                </p>
                <div className="mt-6">
                  <Link to="/auth/login">
                    <Button className="w-full">
                      Prijavi se sada
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <KeyRound className="size-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Nova lozinka
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Unesite novu lozinku za vaš račun
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-6 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova lozinka</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Najmanje 8 karaktera"
                        autoComplete="new-password"
                        autoFocus
                        className={cn(
                          "h-11 pr-10",
                          fieldErrors.password && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ponovite lozinku"
                        autoComplete="new-password"
                        className={cn(
                          "h-11 pr-10",
                          fieldErrors.confirmPassword && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !password || !confirmPassword}
                    className="w-full h-11 font-medium"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Resetovanje...
                      </>
                    ) : (
                      "Resetuj lozinku"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
