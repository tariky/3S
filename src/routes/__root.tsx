import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Toaster } from "sonner";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { ThemeProvider, themeScript } from "@/components/theme-provider";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-9xl font-bold text-muted-foreground/30">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-foreground">
        Page Not Found
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go back home
      </Link>
    </div>
  );
}

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async () => {
    const settings = await getPublicShopSettingsServerFn();
    return { settings };
  },
  notFoundComponent: NotFound,
  head: ({ loaderData }) => {
    const shopTitle = loaderData?.settings?.shopTitle || "Shop";
    const favicon = loaderData?.settings?.shopFavicon;

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: `${shopTitle}`,
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        // Dynamic favicon from settings
        ...(favicon
          ? [
              {
                rel: "icon",
                href: favicon,
                type: "image/x-icon",
              },
            ]
          : []),
      ],
    };
  },

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider>
          <Outlet />
          <Toaster position="top-center" richColors />
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
