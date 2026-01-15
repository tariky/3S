"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderContext {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	resolvedTheme: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeProviderContext | undefined>(undefined);

const STORAGE_KEY = "theme";

function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
	if (typeof window === "undefined") return "system";
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}
	return "system";
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

	if (resolvedTheme === "dark") {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}

	return resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = React.useState<Theme>("system");
	const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");
	const [mounted, setMounted] = React.useState(false);

	// Initialize theme from localStorage
	React.useEffect(() => {
		const storedTheme = getStoredTheme();
		setThemeState(storedTheme);
		const resolved = applyTheme(storedTheme);
		setResolvedTheme(resolved);
		setMounted(true);
	}, []);

	// Listen for system theme changes
	React.useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = () => {
			if (theme === "system") {
				const resolved = applyTheme("system");
				setResolvedTheme(resolved);
			}
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	const setTheme = React.useCallback((newTheme: Theme) => {
		setThemeState(newTheme);
		localStorage.setItem(STORAGE_KEY, newTheme);
		const resolved = applyTheme(newTheme);
		setResolvedTheme(resolved);
	}, []);

	// Prevent flash by not rendering until mounted
	if (!mounted) {
		return null;
	}

	return (
		<ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = React.useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}

// Script to inject in head to prevent flash
export const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('${STORAGE_KEY}');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme !== 'light' && systemDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;
