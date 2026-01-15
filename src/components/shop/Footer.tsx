import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube, ExternalLink } from "lucide-react";
import { getPublicFooterConfigQueryOptions } from "@/queries/footer";
import { useTheme } from "@/components/theme-provider";
import { ProxyImage } from "@/components/ui/proxy-image";

export function Footer() {
  const { data: config, isLoading } = useQuery(getPublicFooterConfigQueryOptions());
  const { resolvedTheme } = useTheme();

  if (isLoading || !config) {
    return null;
  }

  const bgColor = resolvedTheme === "dark" ? config.darkBgColor : config.bgColor;
  const textColor = resolvedTheme === "dark" ? config.darkTextColor : config.textColor;

  const hasSocials =
    config.showSocials &&
    (config.facebookUrl ||
      config.instagramUrl ||
      config.twitterUrl ||
      config.tiktokUrl ||
      config.youtubeUrl);

  return (
    <footer
      className="mt-16"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <div className="container mx-auto px-4 py-12">
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {/* First Column - Logo & Subtitle */}
          <div className="col-span-2 sm:col-span-1">
            {config.logoUrl ? (
              <Link to="/">
                <ProxyImage
                  src={config.logoUrl}
                  alt="Logo"
                  width={120}
                  height={40}
                  resizingType="fit"
                  className="h-8 w-auto mb-4"
                />
              </Link>
            ) : (
              <Link to="/" className="font-bold text-xl mb-4 block">
                Logo
              </Link>
            )}

            {config.subtitle && (
              <p
                className="text-sm leading-relaxed max-w-xs"
                style={{ color: "inherit", opacity: 0.7 }}
              >
                {config.subtitle}
              </p>
            )}

            {/* Social Icons */}
            {hasSocials && (
              <div className="flex gap-3 mt-6">
                {config.facebookUrl && (
                  <a
                    href={config.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-100"
                    style={{ opacity: 0.7 }}
                  >
                    <Facebook className="size-5" />
                  </a>
                )}
                {config.instagramUrl && (
                  <a
                    href={config.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-100"
                    style={{ opacity: 0.7 }}
                  >
                    <Instagram className="size-5" />
                  </a>
                )}
                {config.twitterUrl && (
                  <a
                    href={config.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-100"
                    style={{ opacity: 0.7 }}
                  >
                    <Twitter className="size-5" />
                  </a>
                )}
                {config.tiktokUrl && (
                  <a
                    href={config.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-100"
                    style={{ opacity: 0.7 }}
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                )}
                {config.youtubeUrl && (
                  <a
                    href={config.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-100"
                    style={{ opacity: 0.7 }}
                  >
                    <Youtube className="size-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Link Columns */}
          {config.columns.map((column) => (
            <div key={column.id}>
              <h3 className="font-semibold text-sm mb-4">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => {
                  const isExternal = link.url.startsWith("http");

                  if (isExternal) {
                    return (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm transition-opacity hover:opacity-100 inline-flex items-center gap-1"
                          style={{ color: "inherit", opacity: 0.7 }}
                        >
                          {link.title}
                          <ExternalLink className="size-3" />
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={link.id}>
                      <Link
                        to={link.url}
                        className="text-sm transition-opacity hover:opacity-100"
                        style={{ color: "inherit", opacity: 0.7 }}
                      >
                        {link.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright */}
      {config.copyrightText && (
        <div
          className="border-t"
          style={{ borderColor: `${textColor}20` }}
        >
          <div className="container mx-auto px-4 py-4">
            <p
              className="text-xs text-center"
              style={{ color: "inherit", opacity: 0.6 }}
            >
              {config.copyrightText}
            </p>
          </div>
        </div>
      )}
    </footer>
  );
}
