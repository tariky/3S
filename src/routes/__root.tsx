import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { getPublicShopSettingsServerFn } from "@/queries/settings";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async () => {
    const settings = await getPublicShopSettingsServerFn();
    return { settings };
  },
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
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
        <Scripts />
      </body>
    </html>
  );
}
