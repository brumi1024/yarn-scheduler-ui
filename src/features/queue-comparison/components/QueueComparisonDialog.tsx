import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { buildComparisonData, exportComparison } from '../utils/comparison';
import { ComparisonTable } from './ComparisonTable';

interface QueueComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QueueComparisonDialog: React.FC<QueueComparisonDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { getComparisonData, comparisonQueues } = useSchedulerStore();

  const comparisonData = useMemo(() => {
    const configs = getComparisonData();
    return buildComparisonData(configs);
  }, [getComparisonData, comparisonQueues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 sm:!max-w-[95vw]">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Queue Configuration Comparison</DialogTitle>
          <DialogDescription>
            Comparing {comparisonData.queues.length} queues. Differences are highlighted in blue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 py-4">
          <ComparisonTable data={comparisonData} />
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => exportComparison(comparisonData)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
