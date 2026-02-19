"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Zap } from "lucide-react";
import { DynamicIcon } from "./icon-map";
import { useAuthStore, menuItems } from "@repo/shared";
import type { MenuItem } from "@repo/shared";

export function AppSidebar() {
  const pathname = usePathname();
  const { hasModuleAccess } = useAuthStore();

  const filterMenu = (items: MenuItem[]): MenuItem[] => {
    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter(
            (child) => !child.moduleId || hasModuleAccess(child.moduleId)
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        if (item.moduleId && !hasModuleAccess(item.moduleId)) return null;
        return item;
      })
      .filter(Boolean) as MenuItem[];
  };

  const visibleMenu = filterMenu(menuItems);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Zap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">UI/UX Standard</span>
                  <span className="truncate text-xs text-muted-foreground">Enterprise MVP</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenu.map((item) =>
                item.children ? (
                  <Collapsible key={item.id} defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <DynamicIcon name={item.icon} className="size-4" />
                          <span>{item.label}</span>
                          <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.id}>
                              <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                                <Link href={child.href || "#"}>
                                  <DynamicIcon name={child.icon} className="size-4" />
                                  <span>{child.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href || "#"}>
                        <DynamicIcon name={item.icon} className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="text-xs text-muted-foreground">
              <span>v0.1.0 MVP</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
