import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { getPublicPageBySlugServerFn } from "@/queries/pages";
import { PageContent } from "@/components/pages/PageContent";
import { Button } from "@/components/ui/button";
import { Home, Calendar } from "lucide-react";

export const Route = createFileRoute("/page/$slug")({
  component: PageDetailPage,
  loader: async ({ params }) => {
    const [settings, navigationItems, page] = await Promise.all([
      getPublicShopSettingsServerFn(),
      getPublicNavigationServerFn(),
      getPublicPageBySlugServerFn({ data: { slug: params.slug } }).catch(
        () => null
      ),
    ]);

    // Don't throw notFound() - handle in component to avoid SSR bug #5960
    return { settings, navigationItems, page };
  },
  head: ({ loaderData }) => {
    const page = loaderData?.page;
    const shopTitle =
      (loaderData?.settings as { shopTitle?: string } | undefined)?.shopTitle ||
      "Shop";

    if (!page) {
      return {
        meta: [{ title: `Stranica nije pronađena | ${shopTitle}` }],
      };
    }

    const title = page.seoTitle || `${page.title} | ${shopTitle}`;
    const description = page.seoDescription || page.excerpt || "";

    return {
      meta: [
        { title },
        ...(description ? [{ name: "description", content: description }] : []),
        // Open Graph
        { property: "og:title", content: page.title },
        ...(description
          ? [{ property: "og:description", content: description }]
          : []),
        { property: "og:type", content: "article" },
      ],
    };
  },
  notFoundComponent: () => {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">404</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Stranica nije pronađena
          </h1>
          <p className="text-gray-600 mb-8">
            Stranica koju tražite ne postoji, premještena je ili je uklonjena.
          </p>
          <Button asChild>
            <Link to="/">
              <Home className="size-4 mr-2" />
              Nazad na početnu
            </Link>
          </Button>
        </div>
      </div>
    );
  },
});

function PageDetailPage() {
  const { settings, navigationItems, page } = Route.useLoaderData();

  // Handle page not found - render 404 UI instead of throwing
  // This is a workaround for TanStack Start SSR bug #5960
  if (!page) {
    return (
      <ShopLayout settings={settings} navigationItems={navigationItems}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">404</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Stranica nije pronađena
            </h1>
            <p className="text-gray-600 mb-8">
              Stranica koju tražite ne postoji, premještena je ili je uklonjena.
            </p>
            <Button asChild>
              <Link to="/">
                <Home className="size-4 mr-2" />
                Nazad na početnu
              </Link>
            </Button>
          </div>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout settings={settings} navigationItems={navigationItems}>
      <main className="min-h-[60vh]">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-gray-50 to-white border-b">
          <div className="container mx-auto px-4 py-8 lg:py-12">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                {page.title}
              </h1>
              {page.excerpt && (
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  {page.excerpt}
                </p>
              )}
              {page.updatedAt && (
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                  <Calendar className="size-4" />
                  <span>
                    Ažurirano:{" "}
                    {new Date(page.updatedAt).toLocaleDateString("hr-HR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <article className="max-w-3xl mx-auto">
            <PageContent content={page.content} />
          </article>
        </div>

        {/* Back to Home */}
        <div className="border-t">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
              <Button variant="outline" asChild>
                <Link to="/">
                  <Home className="size-4 mr-2" />
                  Nazad na početnu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </ShopLayout>
  );
}
