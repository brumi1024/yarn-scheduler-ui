import { PlacementRulesList } from '~/features/placement-rules/components/PlacementRulesList';
import { PlacementRuleDetail } from '~/features/placement-rules/components/PlacementRuleDetail';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useSchedulerStore } from '~/stores/schedulerStore';

export default function PlacementRulesRoute() {
  const selectedRuleIndex = useSchedulerStore((state) => state.selectedRuleIndex);

  return (
    <div className="h-full">
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
    </div>
  );
}
