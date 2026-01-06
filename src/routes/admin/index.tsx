import { createFileRoute, redirect } from "@tanstack/react-router";
import { checkAdminAccessServerFn } from "@/server/auth.server";

export const Route = createFileRoute("/admin/")({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    const result = await checkAdminAccessServerFn();
    
    if (!result.authenticated) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href,
        },
      });
    }
    
    if (!result.isAdmin) {
      throw redirect({
        to: "/",
        replace: true,
      });
    }
  },
});

function RouteComponent() {
  return <div>admin page</div>;
}
