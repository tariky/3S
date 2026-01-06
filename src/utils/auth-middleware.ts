import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const headers = request.headers;
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw redirect({ to: "/auth/login" });
    }
    return next({
      context: {
        user: session.user,
        session: session.session,
        headers: headers,
      },
    });
  }
);

export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    console.log("adminMiddleware");
    console.log(context.user);
    if (context.user.role !== "admin") {
      throw redirect({ to: "/", replace: true });
    }
    return next();
  });
