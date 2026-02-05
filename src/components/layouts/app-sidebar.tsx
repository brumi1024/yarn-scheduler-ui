import { Link, useLocation } from 'react-router';
import { LayoutDashboard, Tag, Settings, ListFilter } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '~/components/ui/sidebar';

const navigation = [
  {
    path: '/',
    title: 'Queues',
    icon: LayoutDashboard,
  },
  {
    path: '/global-settings',
    title: 'Global Settings',
    icon: Settings,
  },
  {
    path: '/placement-rules',
    title: 'Placement Rules',
    icon: ListFilter,
  },
  {
    path: '/node-labels',
    title: 'Node Labels',
    icon: Tag,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex h-16 items-center px-4 border-b border-sidebar-border/50">
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Capacity Scheduler UI
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-4">
        <SidebarMenu className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className="transition-all duration-200 hover:translate-x-0.5"
                >
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.title}</span>
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
