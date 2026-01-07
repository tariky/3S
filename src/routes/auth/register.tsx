import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formOptions, useForm } from "@tanstack/react-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader, CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CART_QUERY_KEY, mergeCartsMutationOptions } from "@/queries/cart";
import { useCartSession } from "@/hooks/useCartSession";
import { getUserRoleServerFn, createCustomerFromUserServerFn } from "@/server/auth.server";

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
  name: "" 
};

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
});

function RouteComponent() {
  const [error, setError] = useState<{ message: string } | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sessionId, clearSession } = useCartSession();
  const mergeCartsMutation = useMutation(mergeCartsMutationOptions());

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
        setError({ 
          message: validation.error.errors[0]?.message || "Molimo popunite sva polja ispravno" 
        });
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
            setError({ message: "Korisnik sa ovom email adresom već postoji" });
          } else {
            setError({ 
              message: response.error.message || "Greška pri registraciji. Molimo pokušajte ponovo." 
            });
          }
          return;
        }

        // Registration successful - create customer record
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
            // Don't fail registration if customer creation fails
          }
        }

        // Registration successful
        setSuccess(true);

        // If user was created and has a session, merge carts
        if (response.data?.user?.id && sessionId) {
          try {
            await mergeCartsMutation.mutateAsync({
              guestSessionId: sessionId,
              userId: response.data.user.id,
            });
            queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
            clearSession();
          } catch (error) {
            console.error("Error merging carts:", error);
          }
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
        setError({ 
          message: err?.message || "Greška pri registraciji. Molimo pokušajte ponovo." 
        });
      }
    },
  });

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Registruj nalog</CardTitle>
              <CardDescription>
                Unesite svoje podatke ispod da biste se registrirali na našu aplikaciju
              </CardDescription>
            </CardHeader>

            <CardContent>
              {success && (
                <div className="px-4 py-3 flex items-center border border-green-500 rounded-md mb-6 text-green-700 bg-green-50 text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Registracija uspješna! Preusmjeravanje...</span>
                </div>
              )}

              {error && !success && (
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
                    <FieldLabel htmlFor="name">Ime i prezime</FieldLabel>
                    <form.Field
                      name="name"
                      validators={{
                        onChange: ({ value }) => {
                          const result = registerSchema.shape.name.safeParse(value);
                          return result.success
                            ? undefined
                            : result.error.errors[0]?.message;
                        },
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            id="name"
                            type="text"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Maja Majić"
                            required
                            disabled={success}
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
                    </form.Field>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <form.Field
                      name="email"
                      validators={{
                        onChange: ({ value }) => {
                          const result = registerSchema.shape.email.safeParse(value);
                          return result.success
                            ? undefined
                            : result.error.errors[0]?.message;
                        },
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            id="email"
                            type="email"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="ja@gmail.com"
                            required
                            disabled={success}
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
                    </form.Field>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Lozinka</FieldLabel>
                    <form.Field
                      name="password"
                      validators={{
                        onChange: ({ value }) => {
                          const result = registerSchema.shape.password.safeParse(value);
                          return result.success
                            ? undefined
                            : result.error.errors[0]?.message;
                        },
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            id="password"
                            type="password"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Najmanje 8 karaktera"
                            required
                            disabled={success}
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
                    </form.Field>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Potvrdite lozinku</FieldLabel>
                    <form.Field
                      name="confirmPassword"
                      validators={{
                        onChange: ({ value }) => {
                          const result = registerSchema.shape.confirmPassword.safeParse(value);
                          if (!result.success) {
                            return result.error.errors[0]?.message;
                          }
                          // Check if passwords match
                          if (value !== form.state.values.password) {
                            return "Lozinke se ne poklapaju";
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Ponovite lozinku"
                            required
                            disabled={success}
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
                    </form.Field>
                  </Field>

                  <Field>
                    <form.Subscribe
                      selector={(state) => [state.isSubmitting, state.canSubmit]}
                      children={([isSubmitting, canSubmit]) => (
                        <Button 
                          type="submit" 
                          disabled={isSubmitting || !canSubmit || success}
                          className="w-full"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Registracija...
                            </>
                          ) : success ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Uspješno!
                            </>
                          ) : (
                            "Registruj se"
                          )}
                        </Button>
                      )}
                    />

                    <FieldDescription className="text-center mt-4">
                      Već imate nalog?{" "}
                      <Link 
                        to="/auth/login" 
                        className="text-primary hover:underline font-medium"
                      >
                        Prijavi se
                      </Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
