import { Outlet, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { StagedChangesPanel } from '~/features/staged-changes/components/StagedChangesPanel';
import { AppSidebar } from '~/components/layouts/app-sidebar';
import { ModeToggle } from '~/components/elements/mode-toggle';
import { GlobalRefreshButton } from '~/components/elements/GlobalRefreshButton';
import { DiagnosticsDialog } from '~/components/elements/DiagnosticsDialog';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '~/components/ui/sidebar';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { ChevronRight, Lock } from 'lucide-react';
import { LegacyModeDocumentation } from '~/features/queue-management/components/LegacyModeDocumentation';
import { getMergedConfigData } from '~/utils/configUtils';
import { SPECIAL_VALUES } from '~/types';
import { SearchBar } from '~/components/search/SearchBar';

export default function Layout() {
  const [stagedChangesPanelOpen, setStagedChangesPanelOpen] = useState(false);
  const loadInitialData = useSchedulerStore((state) => state.loadInitialData);
  const configData = useSchedulerStore((state) => state.configData);
  const stagedChanges = useSchedulerStore((state) => state.stagedChanges);
  const setSearchContext = useSchedulerStore((state) => state.setSearchContext);
  const isReadOnly = useSchedulerStore((state) => state.isReadOnly);
  const location = useLocation();

  // Get legacy mode status considering staged changes
  const mergedData = getMergedConfigData(configData, stagedChanges);
  const legacyModeEnabled = mergedData.get(SPECIAL_VALUES.LEGACY_MODE_PROPERTY) !== 'false';

  useEffect(() => {
    loadInitialData().catch((err) => {
      console.error('Failed to load initial data:', err);
    });
  }, [loadInitialData]);

  // Update search context based on current route
  useEffect(() => {
    if (location.pathname === '/') {
      setSearchContext('queues');
    } else if (location.pathname === '/node-labels') {
      setSearchContext('nodes');
    } else if (location.pathname === '/global-settings') {
      setSearchContext('settings');
    } else {
      setSearchContext(null);
    }
  }, [location.pathname, setSearchContext]);

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
    } else if (location.pathname === '/placement-rules') {
      return {
        title: 'Placement Rules',
        description: 'Define rules for application placement in queues',
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
                    <LegacyModeDocumentation legacyModeEnabled={legacyModeEnabled}>
                      <Badge
                        variant={legacyModeEnabled ? 'warning' : 'success'}
                        className="cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 animate-pulse"
                        style={{ animationIterationCount: '3' }}
                      >
                        {legacyModeEnabled ? 'Legacy Mode' : 'Flexible Mode'}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Badge>
                    </LegacyModeDocumentation>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{pageInfo.description}</p>
              </div>
              <SearchBar className="w-64" placeholder="Search" />
              {isReadOnly && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="gap-1.5">
                        <Lock className="h-3 w-3" />
                        Read-Only
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Set yarn.scheduler.capacity.ui.readonly=false in YARN to enable editing</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <GlobalRefreshButton />
              <DiagnosticsDialog />
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
