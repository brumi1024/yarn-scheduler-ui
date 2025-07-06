import React, { useState } from 'react';
import { GitCompareArrows, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { QueueComparisonDialog } from './QueueComparisonDialog';

export const CompareButton: React.FC = () => {
  const { comparisonQueues, clearComparisonQueues, canCompareQueues } = useSchedulerStore();
  const [isOpen, setIsOpen] = useState(false);

  const selectedCount = comparisonQueues.length;

  if (!canCompareQueues()) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsOpen(true)} size="lg" className="shadow-lg">
            <GitCompareArrows className="mr-2 h-4 w-4" />
            Compare {selectedCount} Queues
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={clearComparisonQueues}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <QueueComparisonDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
