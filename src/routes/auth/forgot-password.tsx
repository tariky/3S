import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { z } from "zod";
import { cn } from "@/lib/utils";

const emailSchema = z.string().email("Email nije validan");

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || "Email nije validan");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });

      // Always show success to prevent email enumeration
      setSuccess(true);
    } catch (err: any) {
      // Still show success even on error to prevent email enumeration
      console.error("Forgot password error:", err);
      setSuccess(true);
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
                  <Mail className="size-6 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Provjerite email
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Ako je email adresa registrovana u našem sistemu, poslaćemo vam link za resetovanje lozinke.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Link će isteći za 1 sat. Ako ne vidite email, provjerite spam folder.
                </p>
                <div className="mt-6 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                  >
                    Pokušaj drugi email
                  </Button>
                  <Link to="/auth/login">
                    <Button variant="ghost" className="w-full">
                      Nazad na prijavu
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Zaboravljena lozinka?
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Unesite email adresu i poslaćemo vam link za resetovanje
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
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email adresa</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vas@email.com"
                      autoComplete="email"
                      autoFocus
                      className="h-11"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full h-11 font-medium"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Slanje...
                      </>
                    ) : (
                      "Pošalji link za resetovanje"
                    )}
                  </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Sjetili ste se lozinke?{" "}
                  <Link
                    to="/auth/login"
                    className="font-medium text-foreground hover:underline"
                  >
                    Prijavite se
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
