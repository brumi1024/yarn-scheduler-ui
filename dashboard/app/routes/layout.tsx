import { Outlet, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { useSchedulerStore } from "~/store/schedulerStore";
import { StagedChangesPanel } from "~/components/staged-changes/StagedChangesPanel";
import { AppSidebar } from "~/components/app-sidebar";
import { ModeToggle } from "~/components/mode-toggle";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "~/components/ui/sidebar";

export default function Layout() {
  const [stagedChangesPanelOpen, setStagedChangesPanelOpen] = useState(false);
  const loadInitialData = useSchedulerStore(state => state.loadInitialData);
  const stagedChanges = useSchedulerStore(state => state.stagedChanges);
  const location = useLocation();

  useEffect(() => {
    loadInitialData().catch(err => {
      console.error('Failed to load initial data:', err);
    });
  }, [loadInitialData]);

  // Determine page title and description based on current route
  const getPageInfo = () => {
    if (location.pathname === '/') {
      return {
        title: 'Queue Hierarchy',
        description: 'Visualize and manage your YARN Capacity Scheduler queues'
      };
    } else if (location.pathname === '/global-settings') {
      return {
        title: 'Global Settings',
        description: 'Configure scheduler-wide settings and properties'
      };
    } else if (location.pathname === '/node-labels') {
      return {
        title: 'Node Labels',
        description: 'Manage node labels and node-to-label mappings'
      };
    } else if (location.pathname.startsWith('/queue/')) {
      const queuePath = location.pathname.replace('/queue/', '');
      return {
        title: `Queue: ${queuePath}`,
        description: 'View and edit queue properties'
      };
    }
    return { title: '', description: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
      } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            {/* Header with page title */}
            <header className="flex h-16 items-center gap-4 border-b px-6">
              <SidebarTrigger />
              <div className="flex-1">
                <h1 className="text-xl font-semibold">{pageInfo.title}</h1>
                <p className="text-sm text-muted-foreground">{pageInfo.description}</p>
              </div>
              <ModeToggle />
            </header>
            
            {/* Page content */}
            <div className="flex-1 overflow-hidden">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
      
      <StagedChangesPanel 
        open={stagedChangesPanelOpen} 
        onClose={() => setStagedChangesPanelOpen(false)}
        onOpen={() => setStagedChangesPanelOpen(true)}
      />
    </SidebarProvider>
  );
}