import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/lib/auth";
import { adminMiddleware, authMiddleware } from "@/utils/auth-middleware";
import { loginSchema, signUpSchema } from "@/schemas/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { user, customers } from "@/db/schema";
import { nanoid } from "nanoid";

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

// Helper to create customer record from user
async function createCustomerFromUser(userEmail: string, userName: string) {
  const normalizedEmail = userEmail.toLowerCase().trim();
  
  // Check if customer already exists
  const [existingCustomer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, normalizedEmail))
    .limit(1);

  if (existingCustomer) {
    return existingCustomer.id;
  }

  // Create new customer from user
  const customerId = nanoid();
  const nameParts = userName?.split(" ") || [];
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(" ") || null;

  await db.insert(customers).values({
    id: customerId,
    email: normalizedEmail,
    firstName,
    lastName,
    phone: null,
    hasEmail: true,
    acceptsMarketing: false,
    totalSpent: "0",
    ordersCount: 0,
    status: "active",
  });

  return customerId;
}

// Create customer record after user registration
export const createCustomerFromUserServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    try {
      const customerId = await createCustomerFromUser(data.email, data.name);
      return {
        success: true,
        customerId,
      };
    } catch (error) {
      console.error("Error creating customer:", error);
      return {
        success: false,
        customerId: null,
      };
    }
  });

export const signUpEmailServerFn = createServerFn({ method: "POST" })
  .inputValidator(signUpSchema)
  .handler(async ({ data }) => {
    try {
      const userResult = await auth.api.signUpEmail({
        body: data,
      });
      
      // Create customer record for the new user
      try {
        await createCustomerFromUser(data.email, data.name);
      } catch (customerError) {
        console.error("Error creating customer record:", customerError);
        // Don't fail registration if customer creation fails
      }
      
      return {
        success: true,
        message: "Uspješna registracija",
        userId: userResult.user.id,
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

// Check if current user is authenticated (for route protection without throwing)
export const checkAuthServerFn = createServerFn({ method: "GET" })
  .handler(async ({ request }) => {
    const headers = request.headers;
    const session = await auth.api.getSession({ headers });
    
    if (!session) {
      return { authenticated: false, user: null };
    }
    
    return {
      authenticated: true,
      user: session.user,
    };
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

// Activate account by setting password (Lazy Registration)
export const activateAccountServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8, "Lozinka mora biti najmanje 8 karaktera"),
    })
  )
  .handler(async ({ data, request }) => {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      // User already exists with an account, try to sign them in with the provided password
      try {
        const signInResult = await auth.api.signInEmail({
          body: {
            email: normalizedEmail,
            password: data.password,
          },
          headers: request.headers,
        });

        return {
          success: true,
          message: "Nalog aktiviran!",
          user: signInResult.user,
          session: signInResult.session,
        };
      } catch (error) {
        // Password is incorrect for existing account
        return {
          success: false,
          message: "Korisnik već postoji sa ovom email adresom. Molimo prijavite se sa postojećom lozinkom.",
          user: null,
          session: null,
        };
      }
    }

    // User doesn't exist, create new account
    try {
      // Get customer info to use for user name
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, normalizedEmail))
        .limit(1);

      // Create user name from customer data or use email
      const userName = customer
        ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || normalizedEmail
        : normalizedEmail;

      // Create user account
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: normalizedEmail,
          name: userName,
          password: data.password,
        },
        headers: request.headers,
      });

      return {
        success: true,
        message: "Nalog aktiviran!",
        user: signUpResult.user,
        session: signUpResult.session,
      };
    } catch (error: any) {
      console.error("Error activating account:", error);
      return {
        success: false,
        message: error?.message || "Greška pri aktivaciji naloga. Molimo pokušajte ponovo.",
        user: null,
        session: null,
      };
    }
  });
