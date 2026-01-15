import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formOptions, useForm } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CART_QUERY_KEY, mergeCartsMutationOptions } from "@/queries/cart";
import { WISHLIST_QUERY_KEY, mergeWishlistsMutationOptions } from "@/queries/wishlist";
import { useCartSession } from "@/hooks/useCartSession";
import { getUserRoleServerFn, createCustomerFromUserServerFn, sendWelcomeEmailServerFn } from "@/server/auth.server";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Ime mora biti najmanje 2 karaktera"),
  email: z.string().email("Email nije validan"),
  password: z.string().min(8, "Lozinka mora biti najmanje 8 karaktera"),
  confirmPassword: z.string().min(8, "Potvrda lozinke mora biti najmanje 8 karaktera"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Lozinke se ne poklapaju",
  path: ["confirmPassword"],
});

interface RegistrationUser {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

const defaultUser: RegistrationUser = {
  email: "",
  password: "",
  confirmPassword: "",
  name: "",
};

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
});

function RouteComponent() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sessionId, clearSession } = useCartSession();
  const mergeCartsMutation = useMutation(mergeCartsMutationOptions());
  const mergeWishlistsMutation = useMutation(mergeWishlistsMutationOptions());

  const formOpts = formOptions({
    defaultValues: defaultUser,
  });

  const form = useForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      setError(null);

      // Validate form data
      const validation = registerSchema.safeParse(value);
      if (!validation.success) {
        setError(validation.error.errors[0]?.message || "Molimo popunite sva polja ispravno");
        return;
      }

      try {
        const response = await authClient.signUp.email({
          email: value.email,
          name: value.name,
          password: value.password,
        });

        if (response.error) {
          if (response.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
            setError("Korisnik sa ovom email adresom već postoji");
          } else {
            setError(response.error.message || "Greška pri registraciji. Molimo pokušajte ponovo.");
          }
          return;
        }

        // Registration successful - create customer record and send welcome email
        if (response.data?.user?.id) {
          try {
            await createCustomerFromUserServerFn({
              data: {
                email: value.email,
                name: value.name,
              },
            });
          } catch (customerError) {
            console.error("Error creating customer record:", customerError);
          }

          // Send welcome email (fire-and-forget, don't block UI)
          sendWelcomeEmailServerFn({
            data: {
              email: value.email,
              name: value.name,
            },
          }).catch((emailError) => {
            console.error("Error sending welcome email:", emailError);
          });
        }

        // Registration successful
        setSuccess(true);

        // If user was created and has a session, merge carts and wishlists
        if (response.data?.user?.id && sessionId) {
          try {
            await mergeCartsMutation.mutateAsync({
              guestSessionId: sessionId,
              userId: response.data.user.id,
            });
            queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
          } catch (error) {
            console.error("Error merging carts:", error);
          }

          try {
            await mergeWishlistsMutation.mutateAsync({
              guestSessionId: sessionId,
              userId: response.data.user.id,
            });
            queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY] });
          } catch (error) {
            console.error("Error merging wishlists:", error);
          }

          clearSession();
        }

        // Auto-login after successful registration
        if (response.data?.user?.id) {
          const userRole = await getUserRoleServerFn({
            data: { userId: response.data.user.id },
          });

          // Redirect after a short delay to show success message
          setTimeout(() => {
            if (userRole === "admin") {
              navigate({ to: "/admin", replace: true });
            } else {
              navigate({ to: "/", replace: true });
            }
          }, 1500);
        } else {
          // If auto-login didn't work, redirect to login page
          setTimeout(() => {
            navigate({ to: "/auth/login" });
          }, 1500);
        }
      } catch (err: any) {
        setError(err?.message || "Greška pri registraciji. Molimo pokušajte ponovo.");
      }
    },
  });

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
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Kreirajte nalog
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Unesite svoje podatke za registraciju
              </p>
            </div>

            {/* Success Alert */}
            {success && (
              <div className="flex items-center gap-2 p-3 mb-6 text-sm rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Registracija uspješna! Preusmjeravanje...</span>
              </div>
            )}

            {/* Error Alert */}
            {error && !success && (
              <div className="flex items-center gap-2 p-3 mb-6 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Ime i prezime</Label>
                <form.Field
                  name="name"
                  validators={{
                    onChange: ({ value }) => {
                      const result = registerSchema.shape.name.safeParse(value);
                      return result.success ? undefined : result.error.errors[0]?.message;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <Input
                        id="name"
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Vaše ime"
                        autoComplete="name"
                        disabled={success}
                        className={cn(
                          "h-11",
                          field.state.meta.errors.length > 0 && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive mt-1.5">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <form.Field
                  name="email"
                  validators={{
                    onChange: ({ value }) => {
                      const result = registerSchema.shape.email.safeParse(value);
                      return result.success ? undefined : result.error.errors[0]?.message;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <Input
                        id="email"
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="vas@email.com"
                        autoComplete="email"
                        disabled={success}
                        className={cn(
                          "h-11",
                          field.state.meta.errors.length > 0 && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive mt-1.5">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Lozinka</Label>
                <form.Field
                  name="password"
                  validators={{
                    onChange: ({ value }) => {
                      const result = registerSchema.shape.password.safeParse(value);
                      return result.success ? undefined : result.error.errors[0]?.message;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Najmanje 8 karaktera"
                          autoComplete="new-password"
                          disabled={success}
                          className={cn(
                            "h-11 pr-10",
                            field.state.meta.errors.length > 0 && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={success}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive mt-1.5">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
                <form.Field
                  name="confirmPassword"
                  validators={{
                    onChange: ({ value }) => {
                      const result = registerSchema.shape.confirmPassword.safeParse(value);
                      if (!result.success) {
                        return result.error.errors[0]?.message;
                      }
                      if (value !== form.state.values.password) {
                        return "Lozinke se ne poklapaju";
                      }
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Ponovite lozinku"
                          autoComplete="new-password"
                          disabled={success}
                          className={cn(
                            "h-11 pr-10",
                            field.state.meta.errors.length > 0 && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={success}
                        >
                          {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive mt-1.5">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Submit Button */}
              <form.Subscribe
                selector={(state) => [state.isSubmitting, state.canSubmit]}
              >
                {([isSubmitting, canSubmit]) => (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !canSubmit || success}
                    className="w-full h-11 font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Registracija...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle2 className="size-4 mr-2" />
                        Uspješno!
                      </>
                    ) : (
                      "Registruj se"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Već imate nalog?{" "}
              <Link
                to="/auth/login"
                className="font-medium text-foreground hover:underline"
              >
                Prijavite se
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Registracijom prihvatate naše{" "}
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
