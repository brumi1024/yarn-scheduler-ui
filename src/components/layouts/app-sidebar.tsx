import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Tag,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "~/components/ui/sidebar";

const navigation = [
  {
    path: "/",
    title: "Queues",
    icon: LayoutDashboard,
  },
  {
    path: "/node-labels",
    title: "Node Labels",
    icon: Tag,
  },
  {
    path: "/global-settings",
    title: "Global Settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex h-14 items-center px-4">
          <h1 className="text-lg font-semibold">YARN Scheduler</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path === "/" && location.pathname.startsWith("/queue/"));
            
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}