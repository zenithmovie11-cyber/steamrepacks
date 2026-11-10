import { Link, useRouterState } from "@tanstack/react-router";
import { Terminal, Library, Layers, ShieldCheck, ShieldBan, ChartNoAxesCombined, Images, KeyRound, BadgePercent, Megaphone, BellRing } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "@/hooks/use-session";

const adminItems = [
  { title: "Overview & Quick Stats", url: "/dev-console", icon: Terminal, tone: "bg-info-soft text-info", permission: 'overview.view' },
  { title: "Analytics", url: "/analytics", icon: ChartNoAxesCombined, tone: "bg-success-soft text-success", permission: 'analytics.view' },
  { title: "Hero Slides", url: "/hero-slides", icon: Images, tone: "bg-warning-soft text-warning", permission: 'slides.manage' },
  { title: "Special Offers", url: "/offers", icon: BadgePercent, tone: "bg-primary/10 text-primary", permission: 'posts.edit' },
  { title: "Bottom Banner CTA", url: "/bottom-cta", icon: Megaphone, tone: "bg-info-soft text-info", permission: 'slides.manage' },
  { title: "Announcement Bar", url: "/announcement-bar", icon: BellRing, tone: "bg-warning-soft text-warning", permission: 'slides.manage' },
  { title: "Lookbook Gallery", url: "/lookbooks", icon: Images, tone: "bg-success-soft text-success", permission: 'slides.manage' },
  { title: "Customer Reviews", url: "/reviews", icon: Star, tone: "bg-warning-soft text-warning", permission: 'slides.manage' },
  { title: "Roles & Security", url: "/admin", icon: KeyRound, tone: "bg-primary/10 text-primary", permission: 'roles.manage' },
  { title: "IP Security & Block", url: "/ip-security", icon: ShieldBan, tone: "bg-destructive/10 text-destructive", permission: 'roles.manage' },
] as const;

export function AppSidebar() {
  const { user, isAdmin, can, permissions } = useSession();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-20 justify-center border-b px-4 group-data-[collapsible=icon]:px-2">
        <Link to="/" className="flex items-center gap-3 overflow-hidden" aria-label="Monolith home">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><Layers className="size-5" /></span>
          <span className="whitespace-nowrap text-lg font-semibold group-data-[collapsible=icon]:hidden">Monolith</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === "/"} tooltip="Content library" className="h-10">
                  <Link to="/"><Library className="text-primary" /><span>Content library</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
       {permissions.length > 0 && (
        <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                Admin Panel
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.filter(item => can(item.permission)).map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={currentPath === item.url} tooltip={item.title} className="h-10">
                        <Link to={item.url}>
                          <item.icon className={`${item.tone} rounded p-0.5`} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
        </>
      )}
      </SidebarContent>
      {isAdmin && <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <ShieldCheck className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium">Administrator</p>
            <p className="truncate text-[11px] text-muted-foreground" title={user?.email ?? ""}>{user?.email}</p>
          </div>
        </div>
      </SidebarFooter>}
    </Sidebar>
  );
}
