import { PlacementRulesList } from './PlacementRulesList';
import { PlacementRuleDetail } from './PlacementRuleDetail';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useSchedulerStore } from '~/stores/schedulerStore';

export function PlacementRules() {
  const selectedRuleIndex = useSchedulerStore((state) => state.selectedRuleIndex);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full overflow-auto p-6">
          <PlacementRulesList />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full overflow-auto">
          {selectedRuleIndex !== null ? (
            <PlacementRuleDetail />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground">No rule selected</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Select a rule from the list to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
