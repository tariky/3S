import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/db/db";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { sendPasswordResetEmail } from "@/server/email.server";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      // Don't await to prevent timing attacks
      sendPasswordResetEmail(user.email, user.name || "Korisniče", url);
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        returned: true,
        input: false,
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [tanstackStartCookies()],
});
