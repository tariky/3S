import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { AlertTriangle, Loader } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface RegistrationUser {
  email: string;
  password: string;
  name: string;
}
const defaultUser: RegistrationUser = { email: "", password: "", name: "" };

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
});

function RouteComponent() {
  const [error, setError] = useState<{ message: string } | null>(null);
  const navigate = useNavigate();
  const formOpts = formOptions({
    defaultValues: defaultUser,
  });

  const form = useForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      console.log(value);
      const response = await authClient.signUp.email({
        email: value.email,
        name: value.name,
        password: value.password,
      });
      if (
        response.error &&
        response.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
      ) {
        setError({ message: "Korisnik sa ovom email adresom već postoji" });
      } else {
        navigate({ to: "/auth/login" });
      }

      console.log(response);
    },
  });
  // TODO: Add email verification
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Registruj nalog</CardTitle>
              <CardDescription>
                Unesite svoje podatke ispod da biste se registrirali na našu
                aplikaciju
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="px-4 py-3 flex items-center border border-red-500 rounded-md mb-6 text-red-500 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />{" "}
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
                    <FieldLabel htmlFor="name">Ime</FieldLabel>
                    <form.Field
                      name="name"
                      children={(field) => (
                        <>
                          <Input
                            id="name"
                            type="text"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Maja Majić"
                            required
                          />
                          {field.state.meta.errors.length > 0 && (
                            <FieldError
                              errors={[
                                {
                                  message: "Ime mora biti duže od 3 karaktera",
                                },
                              ]}
                            />
                          )}
                        </>
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <form.Field
                      name="email"
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
                          />
                          {field.state.meta.errors.length > 0 && (
                            <FieldError
                              errors={[{ message: "Email nije validan" }]}
                            />
                          )}
                        </>
                      )}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Lozinka</FieldLabel>
                    </div>
                    <form.Field
                      name="password"
                      children={(field) => (
                        <>
                          <Input
                            id="password"
                            type="password"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                          />
                          {field.state.meta.errors.length > 0 && (
                            <FieldError
                              errors={[
                                {
                                  message:
                                    "Lozinka mora biti duža od 8 karaktera",
                                },
                              ]}
                            />
                          )}
                        </>
                      )}
                    />
                  </Field>
                  <Field>
                    <form.Subscribe
                      selector={(state) => state.isSubmitting}
                      children={(isSubmitting) => (
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            "Registruj se"
                          )}
                        </Button>
                      )}
                    />

                    <FieldDescription className="text-center">
                      Već imate nalog? <a href="/auth/login">Prijavi se</a>
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
