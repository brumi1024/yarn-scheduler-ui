import { Outlet, useLocation, Link } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { StagedChangesPanel } from '~/features/staged-changes/components/StagedChangesPanel';
import { AppSidebar } from '~/components/layouts/app-sidebar';
import { ModeToggle } from '~/components/elements/mode-toggle';
import { GlobalRefreshButton } from '~/components/elements/GlobalRefreshButton';
import { DiagnosticsDialog } from '~/components/elements/DiagnosticsDialog';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '~/components/ui/sidebar';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Info, ChevronRight } from 'lucide-react';
import { LegacyModeDocumentation } from '~/features/queue-management/components/LegacyModeDocumentation';
import { getMergedConfigData } from '~/features/validation/utils/configUtils';
import { SPECIAL_VALUES } from '~/types';
import { SearchBar } from '~/components/search/SearchBar';

export default function Layout() {
  const [stagedChangesPanelOpen, setStagedChangesPanelOpen] = useState(false);
  const loadInitialData = useSchedulerStore((state) => state.loadInitialData);
  const configData = useSchedulerStore((state) => state.configData);
  const stagedChanges = useSchedulerStore((state) => state.stagedChanges);
  const setSearchContext = useSchedulerStore((state) => state.setSearchContext);
  const location = useLocation();

  // Get legacy mode status considering staged changes
  const legacyModeEnabled = useMemo(() => {
    const mergedData = getMergedConfigData(configData, stagedChanges);
    return mergedData.get(SPECIAL_VALUES.LEGACY_MODE_PROPERTY) !== 'false';
  }, [configData, stagedChanges]);

  useEffect(() => {
    loadInitialData().catch((err) => {
      console.error('Failed to load initial data:', err);
    });
  }, [loadInitialData]);

  // Update search context based on current route
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/queue/')) {
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
                    <div className="flex items-center gap-2">
                      <LegacyModeDocumentation>
                        <Badge
                          variant={legacyModeEnabled ? 'warning' : 'success'}
                          className="cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 animate-pulse"
                          style={{ animationIterationCount: '3' }}
                        >
                          {legacyModeEnabled ? 'Legacy Mode' : 'Flexible Mode'}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Badge>
                      </LegacyModeDocumentation>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
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
                            <p className="text-sm font-medium mt-2 text-primary">
                              💡 Click the mode badge to learn more
                            </p>
                            <div className="text-sm mt-2">
                              <Link to="/global-settings" className="underline hover:no-underline">
                                Configure in Global Settings →
                              </Link>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{pageInfo.description}</p>
              </div>
              <SearchBar className="w-64" placeholder="Search" />
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
