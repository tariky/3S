import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formOptions, useForm } from "@tanstack/react-form";
import { useState } from "react";
import { AlertTriangle, Loader } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { loginSchema } from "@/schemas/auth";
import { authClient } from "@/lib/auth-client";
import { getUserRoleServerFn } from "@/server/auth.server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mergeCartsMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
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
  const [error, setError] = useState<{ message: string } | null>(null);
  const navigate = useNavigate();
  const { sessionId, clearSession } = useCartSession();
  const queryClient = useQueryClient();
  const mergeCartsMutation = useMutation(mergeCartsMutationOptions());
  const formOpts = formOptions({
    defaultValues: defaultUser,
  });

  const form = useForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      const response = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
      if (
        response.error &&
        response.error.message === "INVALID_EMAIL_OR_PASSWORD"
      ) {
        setError({ message: "Pogrešna email adresa ili lozinka" });
        return;
      } else {
        const userId = response.data?.user.id!;
        
        // Merge guest cart with user cart if guest session exists
        if (sessionId) {
          try {
            await mergeCartsMutation.mutateAsync({
              guestSessionId: sessionId,
              userId,
            });
            queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
            clearSession();
          } catch (error) {
            console.error("Error merging carts:", error);
          }
        }

        const userRole = await getUserRoleServerFn({
          data: {
            userId,
          },
        });
        if (userRole === "admin") {
          navigate({ to: "/admin", replace: true });
        } else if (redirectTo) {
          // Use history.push for full URL redirect
          window.location.href = redirectTo;
        } else {
          navigate({ to: "/", replace: true });
        }
      }
    },
  });
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Prijavi se na svoj nalog</CardTitle>
          <CardDescription>
            Unesite svoju email adresu i lozinku da biste se prijavili
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="px-4 py-3 flex items-center border border-red-500 rounded-md mb-6 text-red-500 bg-red-50 text-sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="font-semibold">{error.message}</span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <form.Field
                  name="email"
                  validators={{
                    onChange: ({ value }) => {
                      return loginSchema.shape.email.safeParse(value).success
                        ? undefined
                        : "Email nije validan";
                    },
                  }}
                  children={(field) => (
                    <>
                      <Input
                        id="email"
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="ja@gmail.com"
                        required
                        className={
                          field.state.meta.errors.length > 0
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {field.state.meta.errors.length > 0 && (
                        <FieldError
                          errors={[{ message: field.state.meta.errors[0] }]}
                        />
                      )}
                    </>
                  )}
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Lozinka</FieldLabel>
                  <Link
                    to="#"
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Implement password reset
                      alert("Funkcija za resetovanje lozinke će biti dostupna uskoro");
                    }}
                  >
                    Zaboravljena lozinka?
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
                  children={(field) => (
                    <>
                      <Input
                        id="password"
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Unesite lozinku"
                        required
                        className={
                          field.state.meta.errors.length > 0
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {field.state.meta.errors.length > 0 && (
                        <FieldError
                          errors={[{ message: field.state.meta.errors[0] }]}
                        />
                      )}
                    </>
                  )}
                />
              </Field>
              <Field>
                <form.Subscribe
                  selector={(state) => [state.isSubmitting, state.canSubmit]}
                  children={([isSubmitting, canSubmit]) => {
                    return (
                      <Button
                        type="submit"
                        disabled={isSubmitting || !canSubmit}
                        className="w-full"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Prijavljivanje...
                          </>
                        ) : (
                          "Prijavi se"
                        )}
                      </Button>
                    );
                  }}
                />

                <FieldDescription className="text-center mt-4">
                  Nemate nalog?{" "}
                  <Link 
                    to="/auth/register" 
                    className="text-primary hover:underline font-medium"
                  >
                    Registruj se
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
