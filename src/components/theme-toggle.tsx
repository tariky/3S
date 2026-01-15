"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
	className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
	const { theme, setTheme, resolvedTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
					{resolvedTheme === "dark" ? (
						<Moon className="size-5" />
					) : (
						<Sun className="size-5" />
					)}
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => setTheme("light")}
					className={theme === "light" ? "bg-accent" : ""}
				>
					<Sun className="mr-2 size-4" />
					Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark")}
					className={theme === "dark" ? "bg-accent" : ""}
				>
					<Moon className="mr-2 size-4" />
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className={theme === "system" ? "bg-accent" : ""}
				>
					<Monitor className="mr-2 size-4" />
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// Mobile-friendly theme selector for mobile menu
export function MobileThemeSelector() {
	const { theme, setTheme, resolvedTheme } = useTheme();

	return (
		<div className="px-4 py-3">
			<p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
				Tema
			</p>
			<div className="flex gap-2">
				<button
					onClick={() => setTheme("light")}
					className={cn(
						"flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
						theme === "light"
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:bg-muted/80"
					)}
				>
					<Sun className="size-4" />
					<span className="hidden xs:inline">Light</span>
				</button>
				<button
					onClick={() => setTheme("dark")}
					className={cn(
						"flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
						theme === "dark"
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:bg-muted/80"
					)}
				>
					<Moon className="size-4" />
					<span className="hidden xs:inline">Dark</span>
				</button>
				<button
					onClick={() => setTheme("system")}
					className={cn(
						"flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
						theme === "system"
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:bg-muted/80"
					)}
				>
					<Monitor className="size-4" />
					<span className="hidden xs:inline">Auto</span>
				</button>
			</div>
		</div>
	);
}
