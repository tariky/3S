import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/db/db";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string", // You can use an enum or union type here
        required: true,
        defaultValue: "customer",
        returned: true,
        input: false, // Security: Prevent users from setting this during signup
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [tanstackStartCookies()],
});
