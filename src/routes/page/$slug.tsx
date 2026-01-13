import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { getPublicPageBySlugServerFn } from "@/queries/pages";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/page/$slug")({
  component: PageDetailPage,
  loader: async ({ params }) => {
    const [settings, navigationItems, page] = await Promise.all([
      getPublicShopSettingsServerFn(),
      getPublicNavigationServerFn(),
      getPublicPageBySlugServerFn({ data: { slug: params.slug } }).catch(() => null),
    ]);

    // Only show published pages
    if (!page) {
      throw notFound();
    }

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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-900 mb-4">
            Stranica nije pronađena
          </h1>
          <p className="text-gray-600 mb-6">
            Stranica koju tražite ne postoji ili je uklonjena.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Nazad na početnu</Link>
          </Button>
        </div>
      </div>
    );
  },
});

function PageDetailPage() {
  const { settings, navigationItems, page } = Route.useLoaderData();

  return (
    <ShopLayout settings={settings} navigationItems={navigationItems}>
      <main className="container mx-auto px-4 py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm">
            <li>
              <Link
                to="/"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Home className="size-4" />
              </Link>
            </li>
            <ChevronRight className="size-4 text-gray-400" />
            <li>
              <span className="text-gray-900 font-medium">{page.title}</span>
            </li>
          </ol>
        </nav>

        {/* Page Content */}
        <article className="max-w-3xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {page.title}
            </h1>
            {page.excerpt && (
              <p className="text-lg text-gray-600">{page.excerpt}</p>
            )}
          </header>

          <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            {/* Render content - supports basic HTML or plain text */}
            <div
              dangerouslySetInnerHTML={{ __html: page.content }}
              className="whitespace-pre-line"
            />
          </div>
        </article>
      </main>
    </ShopLayout>
  );
}
