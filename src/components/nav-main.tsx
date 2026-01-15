import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  // Check if a URL is active (exact match or starts with for parent routes)
  const isActive = (url: string, exact = false) => {
    if (url === "#") return false;
    if (exact) return pathname === url;
    // For /admin (dashboard), only exact match
    if (url === "/admin") return pathname === "/admin";
    return pathname === url || pathname.startsWith(url + "/");
  };

  // Check if any child is active
  const hasActiveChild = (items?: { url: string }[]) => {
    if (!items) return false;
    return items.some((item) => isActive(item.url, true));
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const itemIsActive = isActive(item.url) || hasActiveChild(item.items);
          const shouldBeOpen = itemIsActive || item.isActive;

          return (
            <Collapsible key={item.title} asChild defaultOpen={shouldBeOpen}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive(item.url) && !item.items?.length}
                >
                  <Link to={item.url === "#" ? undefined : item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(subItem.url, true)}
                            >
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
