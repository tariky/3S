"use client";

import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X, ChevronDown, User, LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  getNavigationQueryOptions,
  type NavigationItem,
} from "@/queries/navigation";
import { getPublicShopSettingsQueryOptions } from "@/queries/settings";
import { cn } from "@/lib/utils";
import { CartButton } from "./CartButton";
import { Cart } from "./Cart";
import { AlertBanner } from "./AlertBanner";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Logo component that handles SVG inline rendering
function ShopLogo({
  url,
  width,
  alt,
}: {
  url: string;
  width: number;
  alt: string;
}) {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const isSvg = url.toLowerCase().endsWith(".svg");

  React.useEffect(() => {
    if (isSvg) {
      fetch(url)
        .then((res) => res.text())
        .then((text) => setSvgContent(text))
        .catch(() => setSvgContent(null));
    }
  }, [url, isSvg]);

  if (isSvg && svgContent) {
    return (
      <div
        style={{ width: `${width}px` }}
        className="[&>svg]:w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      style={{ width: `${width}px`, height: "auto" }}
      className="object-contain"
    />
  );
}

// Nav image component that handles SVG inline rendering
function NavImage({ url, className }: { url: string; className?: string }) {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const isSvg = url.toLowerCase().endsWith(".svg");

  React.useEffect(() => {
    if (isSvg) {
      fetch(url)
        .then((res) => res.text())
        .then((text) => setSvgContent(text))
        .catch(() => setSvgContent(null));
    }
  }, [url, isSvg]);

  if (isSvg && svgContent) {
    return (
      <div
        className={cn("size-5 [&>svg]:w-full [&>svg]:h-full", className)}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  return (
    <img src={url} alt="" className={cn("size-5 object-contain", className)} />
  );
}

function NavigationItemComponent({
  item,
  onClose,
}: {
  item: NavigationItem;
  onClose?: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="relative group">
      <Link
        to={item.url as any}
        onClick={onClose}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors",
          hasChildren && "cursor-pointer"
        )}
        onMouseEnter={() => hasChildren && setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {item.image && <NavImage url={item.image} />}
        <span>{item.title}</span>
        {hasChildren && (
          <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
        )}
      </Link>
      {hasChildren && isOpen && (
        <div
          className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-2"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {item.children?.map((child) => (
            <Link
              key={child.id}
              to={child.url as any}
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              {child.image && <NavImage url={child.image} className="size-4" />}
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShopNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [user, setUser] = React.useState<{
    name: string;
    email: string;
    id: string;
  } | null>(null);
  const [isSessionLoading, setIsSessionLoading] = React.useState(true);
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { data: navigationItems = [] } = useQuery(getNavigationQueryOptions());
  const { data: settings } = useQuery(getPublicShopSettingsQueryOptions());

  // Function to check session
  const checkSession = React.useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsSessionLoading(true);
    }
    const session = await authClient.getSession();
    if (session?.data?.user) {
      setUser({
        name: session.data.user.name || "",
        email: session.data.user.email || "",
        id: session.data.user.id || "",
      });
    } else {
      setUser(null);
    }
    if (isInitial) {
      setIsSessionLoading(false);
    }
  }, []);

  // Check if user is logged in on mount and route changes
  React.useEffect(() => {
    checkSession(true);
  }, [checkSession, routerState.location.pathname]);

  // Refresh session on window focus
  React.useEffect(() => {
    const handleFocus = () => {
      checkSession();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [checkSession]);

  const handleSignOut = async () => {
    await authClient.signOut();
    setUser(null);
    navigate({ to: "/" });
  };

  return (
    <>
      <AlertBanner />
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              {settings?.shopLogo ? (
                <ShopLogo
                  url={settings.shopLogo}
                  width={settings.shopLogoWidth || 120}
                  alt={settings?.shopTitle || "Shop"}
                />
              ) : (
                <>
                  <div className="bg-primary text-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg">
                    <span className="text-xl font-bold">
                      {(settings?.shopTitle || "S")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {settings?.shopTitle || "Shop"}
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => (
                <NavigationItemComponent key={item.id} item={item} />
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <CartButton onClick={() => setCartOpen(true)} />
              {isSessionLoading ? (
                <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <User className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="flex items-center gap-2">
                        <User className="size-4" />
                        Moj profil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/account/orders"
                        className="flex items-center gap-2"
                      >
                        <Package className="size-4" />
                        Moje narudžbe
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="size-4 mr-2" />
                      Odjavi se
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <User className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link
                        to="/auth/login"
                        className="flex items-center gap-2"
                      >
                        <User className="size-4" />
                        Prijavi se
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/auth/register"
                        className="flex items-center gap-2"
                      >
                        <User className="size-4" />
                        Registruj se
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <div key={item.id}>
                    <Link
                      to={item.url as any}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      {item.image && <NavImage url={item.image} />}
                      <span>{item.title}</span>
                    </Link>
                    {item.children && item.children.length > 0 && (
                      <div className="ml-6 mt-1 flex flex-col gap-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            to={child.url as any}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
                          >
                            {child.image && (
                              <NavImage url={child.image} className="size-4" />
                            )}
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {/* Auth Links in Mobile Menu */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  {isSessionLoading ? (
                    <div className="px-4 py-2">
                      <div className="h-4 w-24 bg-gray-100 animate-pulse rounded mb-2" />
                      <div className="h-3 w-32 bg-gray-100 animate-pulse rounded" />
                    </div>
                  ) : user ? (
                    <></>
                  ) : (
                    <>
                      <Link
                        to="/auth/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                      >
                        <User className="size-4" />
                        Prijavi se
                      </Link>
                      <Link
                        to="/auth/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-gray-50 rounded-md"
                      >
                        Registruj se
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <Cart open={cartOpen} onOpenChange={setCartOpen} />
      </nav>
    </>
  );
}
