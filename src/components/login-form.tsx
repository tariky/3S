import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input";
import { formOptions, useForm } from "@tanstack/react-form";

interface User {
  email: string;
  password: string;
}
const defaultUser: User = { email: '', password: '' }

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const formOpts = formOptions({
    defaultValues: defaultUser,
  })

  const form = useForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      // Do something with form data
      console.log(value)
    },
  })
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
          <form onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <form.Field name="email" children={(field) => (
                  <Input
                    id="email"
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="ja@gmail.com"
                    required
                  />
                )} />
               
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
                <form.Field name="password" children={(field) => (
                  <Input
                    id="password"
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                )} />
              </Field>
              <Field>
                <Button type="submit" onClick={() => form.handleSubmit()}>Prijavi se</Button>
                <Button variant="outline" type="button">
                  Prijavi se sa Google
                </Button>
                <FieldDescription className="text-center">
                  Nemate nalog? <a href="#">Registruj se</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
