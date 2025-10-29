import { useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useSchedulerStore } from '~/stores/schedulerStore';

export function GlobalRefreshButton() {
  'use memo';
  const loadInitialData = useSchedulerStore((state) => state.loadInitialData);
  const isLoading = useSchedulerStore((state) => state.isLoading);

  const handleRefresh = useCallback(async () => {
    try {
      await loadInitialData();
    } catch (error) {
      console.error('Failed to refresh scheduler data:', error);
    }
  }, [loadInitialData]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-[1.2rem] w-[1.2rem] ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>Refresh data</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
