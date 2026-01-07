import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkAuthServerFn } from "@/server/auth.server";

export const Route = createFileRoute("/account")({
	component: AccountLayout,
	beforeLoad: async ({ location }) => {
		const result = await checkAuthServerFn();
		
		if (!result.authenticated) {
			throw redirect({
				to: "/auth/login",
				search: {
					redirect: location.href,
				},
			});
		}
	},
});

function AccountLayout() {
	return <Outlet />;
}

