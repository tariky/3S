"use client";

import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X, ChevronDown, User, LogOut, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NavigationItem } from "@/queries/navigation";
import type { ShopSettings } from "@/queries/settings";
import { cn } from "@/lib/utils";
import { CartButton } from "./CartButton";
import { Cart } from "./Cart";
import { SearchDialog } from "./SearchDialog";
import { WishlistNavButton } from "./WishlistNavButton";
import { FlyToCartProvider, useFlyToCart } from "./FlyToCartProvider";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import * as LucideIcons from "lucide-react";
import { ProxyImage } from "@/components/ui/proxy-image";
import { ThemeToggle, MobileThemeSelector } from "@/components/theme-toggle";
import { Footer } from "./Footer";

// Get icon component by name
function getIconComponent(
  name: string
): React.ComponentType<{ className?: string }> | null {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return icons[name] || null;
}

// Logo component that handles SVG inline rendering
function ShopLogo({
  url,
  width,
  alt,
  svgContent,
}: {
  url: string;
  width: number;
  alt: string;
  svgContent?: string | null;
}) {
  // If SVG content is pre-fetched, render it directly
  if (svgContent) {
    return (
      <div
        style={{ width: `${width}px` }}
        className="[&>svg]:w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  return (
    <ProxyImage
      src={url}
      alt={alt}
      width={width}
      style={{ width: `${width}px`, height: "auto" }}
      className="object-contain"
    />
  );
}

// Alert Banner component
function AlertBanner({ settings }: { settings: ShopSettings }) {
  if (!settings.alertEnabled || !settings.alertText) {
    return null;
  }

  const IconComponent = getIconComponent(settings.alertIcon);

  const content = (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium",
        settings.alertBgColor,
        settings.alertTextColor
      )}
    >
      {IconComponent && <IconComponent className="w-4 h-4 flex-shrink-0" />}
      <span>{settings.alertText}</span>
    </div>
  );

  if (settings.alertLink) {
    const isExternal = settings.alertLink.startsWith("http");

    if (isExternal) {
      return (
        <a
          href={settings.alertLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:opacity-90 transition-opacity"
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        to={settings.alertLink as "/"}
        className="block hover:opacity-90 transition-opacity"
      >
        {content}
      </Link>
    );
  }

  return content;
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
          "flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-md transition-colors",
          hasChildren && "cursor-pointer"
        )}
        onMouseEnter={() => hasChildren && setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {item.icon && (
          <span className="text-xs font-semibold text-primary">
            {item.icon}
          </span>
        )}
        <span>{item.title}</span>
        {hasChildren && (
          <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
        )}
      </Link>
      {hasChildren && isOpen && (
        <div
          className="absolute left-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-50 py-2"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {item.children?.map((child) => (
            <Link
              key={child.id}
              to={child.url as any}
              onClick={onClose}
              className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ShopLayoutProps {
  settings: ShopSettings;
  navigationItems: NavigationItem[];
  children: React.ReactNode;
}

export function ShopLayout(props: ShopLayoutProps) {
  return (
    <FlyToCartProvider>
      <ShopLayoutInner {...props} />
    </FlyToCartProvider>
  );
}

function ShopLayoutInner({
  settings,
  navigationItems,
  children,
}: ShopLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { cartRef, wishlistRef, isCartBouncing, isWishlistBouncing } = useFlyToCart();
  const [user, setUser] = React.useState<{
    name: string;
    email: string;
    id: string;
  } | null>(null);
  const navigate = useNavigate();
  const routerState = useRouterState();

  // Function to check session
  const checkSession = React.useCallback(async () => {
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
  }, []);

  // Check if user is logged in on mount and route changes
  React.useEffect(() => {
    checkSession();
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

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AlertBanner settings={settings} />
      <nav className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left Side - Mobile Menu + Logo */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="size-6" />
              </Button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                {settings.shopLogo ? (
                  <ShopLogo
                    url={settings.shopLogo}
                    width={settings.shopLogoWidth || 120}
                    alt={settings.shopTitle || "Shop"}
                    svgContent={settings.shopLogoSvgContent}
                  />
                ) : (
                  <>
                    <div className="bg-primary text-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg">
                      <span className="text-xl font-bold">
                        {(settings.shopTitle || "S")[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-foreground hidden sm:inline">
                      {settings.shopTitle || "Shop"}
                    </span>
                  </>
                )}
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => (
                <NavigationItemComponent key={item.id} item={item} />
              ))}
            </div>

            {/* Right Side Actions - Order: Search, Profile, Wishlist, Cart */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSearchOpen(true)}
                aria-label="Pretraži"
              >
                <Search className="size-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <User className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user ? (
                    <>
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
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
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <WishlistNavButton
                wishlistRef={wishlistRef}
                isWishlistBouncing={isWishlistBouncing}
              />
              <ThemeToggle className="hidden md:flex" />
              <CartButton
                onClick={() => setCartOpen(true)}
                cartRef={cartRef}
                isCartBouncing={isCartBouncing}
              />
            </div>
          </div>

        </div>

        {/* Mobile Menu Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-left">
                {settings.shopLogo ? (
                  <ShopLogo
                    url={settings.shopLogo}
                    width={Math.min(settings.shopLogoWidth || 120, 140)}
                    alt={settings.shopTitle || "Shop"}
                    svgContent={settings.shopLogoSvgContent}
                  />
                ) : (
                  <span className="text-lg font-semibold">{settings.shopTitle || "Shop"}</span>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col h-[calc(100%-65px)]">
              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto py-4">
                <nav className="flex flex-col gap-1 px-2">
                  {navigationItems.map((item) => (
                    <div key={item.id}>
                      <Link
                        to={item.url as any}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        {item.icon && (
                          <span className="text-xs font-semibold text-primary">
                            {item.icon}
                          </span>
                        )}
                        <span>{item.title}</span>
                      </Link>
                      {item.children && item.children.length > 0 && (
                        <div className="ml-4 mt-1 flex flex-col gap-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.id}
                              to={child.url as any}
                              onClick={() => setMobileMenuOpen(false)}
                              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                              {child.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Bottom Section - Auth & Theme */}
              <div className="border-t border-border p-4 space-y-2">
                {user ? (
                  <>
                    <div className="px-4 py-2 mb-2">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Link
                      to="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <User className="size-4" />
                      Moj profil
                    </Link>
                    <Link
                      to="/account/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <Package className="size-4" />
                      Moje narudžbe
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors w-full text-left"
                    >
                      <LogOut className="size-4" />
                      Odjavi se
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <User className="size-4" />
                      Prijavi se
                    </Link>
                    <Link
                      to="/auth/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary hover:bg-muted rounded-lg transition-colors"
                    >
                      Registruj se
                    </Link>
                  </>
                )}

                {/* Theme Selector */}
                <div className="pt-2 border-t border-border mt-2">
                  <MobileThemeSelector />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Cart open={cartOpen} onOpenChange={setCartOpen} />
        <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </nav>
      <main>{children}</main>
      <Footer />
    </div>
  );
}
