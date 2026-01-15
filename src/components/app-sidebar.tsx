import * as React from "react";
import {
	ChartColumn,
	ClipboardList,
	Cog,
	FileText,
	FolderKanban,
	Home,
	Inbox,
	LayoutDashboard,
	Mail,
	Package,
	PanelBottom,
	Percent,
	ShoppingBag,
	Store,
	Tags,
	Truck,
	Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
	user: {
		name: "Admin",
		email: "admin@lunatik.ba",
		avatar: "/avatars/admin.jpg",
	},
	navMain: [
		{
			title: "Dashboard",
			url: "/admin",
			icon: LayoutDashboard,
		},
		{
			title: "Proizvodi",
			url: "/admin/products",
			icon: Tags,
			items: [
				{
					title: "Svi proizvodi",
					url: "/admin/products",
				},
				{
					title: "Kategorije",
					url: "/admin/products/categories",
				},
				{
					title: "Definicije",
					url: "/admin/products/definitions",
				},
				{
					title: "Dobavljači",
					url: "/admin/products/vendors",
				},
			],
		},
		{
			title: "Kolekcije",
			url: "/admin/collections",
			icon: FolderKanban,
		},
		{
			title: "Narudžbe",
			url: "/admin/orders",
			icon: Inbox,
			items: [
				{
					title: "Sve narudžbe",
					url: "/admin/orders",
				},
				{
					title: "Napuštene korpe",
					url: "/admin/abandoned-checkouts",
				},
			],
		},
		{
			title: "Kupci",
			url: "/admin/customers",
			icon: Users,
		},
		{
			title: "Inventar",
			url: "/admin/inventory",
			icon: Package,
		},
		{
			title: "Narudžbenice",
			url: "/admin/purchase-orders",
			icon: Truck,
		},
		{
			title: "Popusti",
			url: "/admin/discounts",
			icon: Percent,
		},
		{
			title: "Analitika",
			url: "#",
			icon: ChartColumn,
			items: [
				{
					title: "Lista želja",
					url: "/admin/analytics/wishlist",
				},
				{
					title: "Sell-through rate",
					url: "/admin/analytics/sell-through",
				},
			],
		},
		{
			title: "Stranice",
			url: "/admin/pages",
			icon: FileText,
		},
		{
			title: "Shop",
			url: "/admin/shop",
			icon: Store,
		},
		{
			title: "Homepage Builder",
			url: "/admin/homepage",
			icon: Home,
		},
		{
			title: "Footer Builder",
			url: "/admin/footer",
			icon: PanelBottom,
		},
		{
			title: "Email logovi",
			url: "/admin/email-logs",
			icon: Mail,
		},
	],
	navSecondary: [
		{
			title: "Postavke",
			url: "/admin/settings",
			icon: Cog,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader className="border-b">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link to="/admin">
								<div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<ShoppingBag className="size-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">Lunatik</span>
									<span className="truncate text-xs text-muted-foreground">Admin Panel</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter className="border-t">
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	);
}
