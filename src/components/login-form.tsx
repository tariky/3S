import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formOptions, useForm } from "@tanstack/react-form";
import { useState } from "react";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { loginSchema } from "@/schemas/auth";
import { authClient } from "@/lib/auth-client";
import { getUserRoleServerFn } from "@/server/auth.server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mergeCartsMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
import { mergeWishlistsMutationOptions, WISHLIST_QUERY_KEY } from "@/queries/wishlist";
import { useCartSession } from "@/hooks/useCartSession";

interface User {
  email: string;
  password: string;
}
const defaultUser: User = { email: "", password: "" };

interface LoginFormProps extends React.ComponentProps<"div"> {
  redirectTo?: string;
}

export function LoginForm({
  className,
  redirectTo,
  ...props
}: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { sessionId, clearSession } = useCartSession();
  const queryClient = useQueryClient();
  const mergeCartsMutation = useMutation(mergeCartsMutationOptions());
  const mergeWishlistsMutation = useMutation(mergeWishlistsMutationOptions());

  const formOpts = formOptions({
    defaultValues: defaultUser,
  });

  const form = useForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      setError(null);
      const response = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });

      if (response.error && response.error.message === "INVALID_EMAIL_OR_PASSWORD") {
        setError("Pogrešna email adresa ili lozinka");
        return;
      }

      const userId = response.data?.user.id!;

      // Merge guest cart and wishlist with user if guest session exists
      if (sessionId) {
        try {
          await mergeCartsMutation.mutateAsync({
            guestSessionId: sessionId,
            userId,
          });
          queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
        } catch (error) {
          console.error("Error merging carts:", error);
        }

        try {
          await mergeWishlistsMutation.mutateAsync({
            guestSessionId: sessionId,
            userId,
          });
          queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY] });
        } catch (error) {
          console.error("Error merging wishlists:", error);
        }

        clearSession();
      }

      const userRole = await getUserRoleServerFn({
        data: { userId },
      });

      if (userRole === "admin") {
        navigate({ to: "/admin", replace: true });
      } else if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        navigate({ to: "/", replace: true });
      }
    },
  });

  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dobrodošli nazad
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Prijavite se na svoj nalog
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                return loginSchema.shape.email.safeParse(value).success
                  ? undefined
                  : "Email nije validan";
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Lozinka</Label>
            <Link
              to="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Zaboravili ste lozinku?
            </Link>
          </div>
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                return loginSchema.shape.password.safeParse(value).success
                  ? undefined
                  : "Lozinka mora biti duža od 8 karaktera";
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
                    placeholder="Unesite lozinku"
                    autoComplete="current-password"
                    className={cn(
                      "h-11 pr-10",
                      field.state.meta.errors.length > 0 && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
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
              disabled={isSubmitting || !canSubmit}
              className="w-full h-11 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Prijavljivanje...
                </>
              ) : (
                "Prijavi se"
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Nemate nalog?{" "}
        <Link
          to="/auth/register"
          className="font-medium text-foreground hover:underline"
        >
          Registrujte se
        </Link>
      </p>
    </div>
  );
}
