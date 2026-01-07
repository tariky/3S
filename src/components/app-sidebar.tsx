import * as React from "react";
import {
	ChartColumn,
	Cog,
	FileText,
	Frame,
	Inbox,
	LucideBookImage,
	Map,
	Percent,
	PieChart,
	Store,
	Tags,
	Users,
} from "lucide-react";

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
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	navMain: [
		{
			title: "Proizvodi",
			url: "/admin/products",
			icon: Tags,
			isActive: true,
			items: [
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
				{
					title: "Inventori",
					url: "/admin/products/inventory",
				},
			],
		},
		{
			title: "Narudžbe",
			url: "/admin/orders",
			icon: Inbox,
		},
		{
			title: "Kupci",
			url: "/admin/customers",
			icon: Users,
		},
		{
			title: "Popusti",
			url: "#",
			icon: Percent,
			items: [],
		},
		{
			title: "Analitika",
			url: "#",
			icon: ChartColumn,
			items: [],
		},
		{
			title: "Stranice",
			url: "/admin/pages",
			icon: FileText,
		},
		{
			title: "Shop",
			url: "/admin/navigation",
			icon: LucideBookImage,
			items: [],
		},
	],
	navSecondary: [
		{
			title: "Postavke",
			url: "/admin/settings",
			icon: Cog,
		},
	],
	projects: [
		{
			name: "Design Engineering",
			url: "#",
			icon: Frame,
		},
		{
			name: "Sales & Marketing",
			url: "#",
			icon: PieChart,
		},
		{
			name: "Travel",
			url: "#",
			icon: Map,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<a href="#">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<Store className="size-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">Lunatik</span>
									<span className="truncate text-xs">Web shop</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				{/* <NavProjects projects={data.projects} /> */}
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	);
}
