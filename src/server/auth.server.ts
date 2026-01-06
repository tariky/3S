import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/lib/auth";
import { adminMiddleware, authMiddleware } from "@/utils/auth-middleware";
import { loginSchema, signUpSchema } from "@/schemas/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { user } from "@/db/schema";

export const signInEmailServerFn = createServerFn({ method: "POST" })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    try {
      const user = await auth.api.signInEmail({
        body: data,
      });
      return {
        success: true,
        message: "Uspješna prijava",
        userId: user.user.id,
      };
    } catch (error) {
      return {
        success: false,
        message: "Pogrešna email adresa ili lozinka",
        userId: null,
      };
    }
  });

export const signUpEmailServerFn = createServerFn({ method: "POST" })
  .inputValidator(signUpSchema)
  .handler(async ({ data }) => {
    try {
      const user = await auth.api.signUpEmail({
        body: data,
      });
      return {
        success: true,
        message: "Uspješna registracija",
        userId: user.user.id,
      };
    } catch (error) {
      return {
        success: false,
        message: "Korisnik sa ovom email adresom već postoji",
        userId: null,
      };
    }
  });

// General auth check
export const authCheckServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return context.user;
  });

// Admin check
export const adminCheckServerFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    console.log("adminCheckServerFn");
    console.log(context);
    return context.user;
  });

export const signOutServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    return auth.api.signOut();
  }
);

export const getUserRoleServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const userResponse = await db.query.user.findFirst({
      where: eq(user.id, data.userId),
    });
    return userResponse?.role;
  });

// Check if current user is admin (for route protection)
export const checkAdminAccessServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const isAdmin = context.user.role === "admin";
    
    if (!isAdmin) {
      return { isAdmin: false, authenticated: true, user: context.user };
    }
    
    return {
      isAdmin: true,
      authenticated: true,
      user: context.user,
    };
  });
