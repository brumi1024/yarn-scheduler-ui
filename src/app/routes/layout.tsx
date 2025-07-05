import { Outlet, useLocation } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { StagedChangesPanel } from '~/features/staged-changes/components/StagedChangesPanel';
import { AppSidebar } from '~/components/layouts/app-sidebar';
import { ModeToggle } from '~/components/elements/mode-toggle';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '~/components/ui/sidebar';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Info } from 'lucide-react';
import { LegacyModeDocumentation } from '~/features/queue-management/components/LegacyModeDocumentation';
import { getMergedConfigData } from '~/utils/validation/stagedChangesUtils';

export default function Layout() {
  const [stagedChangesPanelOpen, setStagedChangesPanelOpen] = useState(false);
  const loadInitialData = useSchedulerStore((state) => state.loadInitialData);
  const configData = useSchedulerStore((state) => state.configData);
  const stagedChanges = useSchedulerStore((state) => state.stagedChanges);
  const location = useLocation();

  // Get legacy mode status considering staged changes
  const legacyModeEnabled = useMemo(() => {
    const mergedData = getMergedConfigData(configData, stagedChanges);
    return mergedData.get('yarn.scheduler.capacity.legacy-queue-mode.enabled') !== 'false';
  }, [configData, stagedChanges]);

  useEffect(() => {
    loadInitialData().catch((err) => {
      console.error('Failed to load initial data:', err);
    });
  }, [loadInitialData]);

  // Determine page title and description based on current route
  const getPageInfo = () => {
    if (location.pathname === '/') {
      return {
        title: 'Queue Hierarchy',
        description: 'Visualize and manage your YARN Capacity Scheduler queues',
      };
    } else if (location.pathname === '/global-settings') {
      return {
        title: 'Global Settings',
        description: 'Configure scheduler-wide settings and properties',
      };
    } else if (location.pathname === '/node-labels') {
      return {
        title: 'Node Labels',
        description: 'Manage node labels and node-to-label mappings',
      };
    } else if (location.pathname.startsWith('/queue/')) {
      const queuePath = location.pathname.replace('/queue/', '');
      return {
        title: `Queue: ${queuePath}`,
        description: 'View and edit queue properties',
      };
    }
    return { title: '', description: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '16rem',
        } as React.CSSProperties
      }
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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold">{pageInfo.title}</h1>
                  {location.pathname === '/' && (
                    <LegacyModeDocumentation>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={legacyModeEnabled ? 'default' : 'secondary'}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <Info className="mr-1 h-3 w-3" />
                              {legacyModeEnabled ? 'Legacy Mode' : 'Flexible Mode'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">
                              {legacyModeEnabled ? 'Legacy Mode Enabled' : 'Flexible Mode Enabled'}
                            </p>
                            <p className="text-sm">
                              {legacyModeEnabled
                                ? 'Strict capacity rules are enforced. All sibling queues must use the same capacity type and child capacities must sum to 100%.'
                                : 'Flexible capacity configuration is allowed. Queues can use different capacity types and child capacities do not need to sum to 100%.'}
                            </p>
                            <p className="text-sm mt-2 text-muted-foreground">
                              Click to learn more • Configure in Global Settings
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </LegacyModeDocumentation>
                  )}
                </div>
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
