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

interface User {
  email: string;
  password: string;
}
const defaultUser: User = { email: "", password: "" };

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [error, setError] = useState<{ message: string } | null>(null);
  const navigate = useNavigate();
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
        const userRole = await getUserRoleServerFn({
          data: {
            userId: response.data?.user.id!,
          },
        });
        if (userRole === "admin") navigate({ to: "/admin", replace: true });
        else navigate({ to: "/", replace: true });
      }
    },
  });
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Prijavi se na svoj nalog</CardTitle>
          <CardDescription>
            Unesite svoju email adresu ispod da biste se prijavili na svoj nalog
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="px-4 py-3 flex items-center border border-red-500 rounded-md mb-6 text-red-500 text-sm">
              <AlertTriangle className="w-4 h-4 mr-2" />{" "}
              <span className="font-semibold text-center">{error.message}</span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <form.Field
                  name="email"
                  validators={{
                    onBlur: ({ value }) => {
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
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Zaboravljena lozinka?
                  </a>
                </div>
                <form.Field
                  name="password"
                  validators={{
                    onBlur: ({ value }) => {
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
                        required
                      />
                      {field.state.meta.errors.length > 0 && (
                        <FieldError
                          errors={[
                            {
                              message: "Lozinka mora biti duža od 8 karaktera",
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
                  children={(isSubmitting) => {
                    return (
                      <Button
                        type="submit"
                        onClick={() => form.handleSubmit()}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          "Prijavi se"
                        )}
                      </Button>
                    );
                  }}
                />

                <Button variant="outline" type="button">
                  Prijavi se sa Google
                </Button>
                <FieldDescription className="text-center">
                  Nemate nalog? <Link to="/auth/register">Registruj se</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
