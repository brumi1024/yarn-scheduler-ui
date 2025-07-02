import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { QueueVisualizationContainer } from '../components/tree/QueueVisualizationContainer';
import { AppLayout } from '../components/AppLayout';
import { useEffect } from 'react';
import { useSchedulerStore } from '../store/schedulerStore';

const queueSearchSchema = z.object({
  panel: z.coerce.boolean().optional().default(false),
});

export const Route = createFileRoute('/queue/$queuePath')({
  validateSearch: queueSearchSchema,
  component: QueueComponent,
});

function QueueComponent() {
  const { queuePath } = Route.useParams();
  const { panel } = Route.useSearch();
  const { selectQueue, setPropertyPanelOpen, selectedQueuePath, getQueueByPath, isLoading } = useSchedulerStore();

  useEffect(() => {
    const decodedQueuePath = decodeURIComponent(queuePath);
    
    // Wait for initial data to load before processing URL parameters
    if (isLoading) {
      return;
    }
    
    // First, select the queue from the URL if it's different
    if (decodedQueuePath !== selectedQueuePath) {
      selectQueue(decodedQueuePath);
    }
    
    // Then, handle panel opening based on URL params
    // Now we can safely check for the queue since data has loaded
    if (panel) {
      const queue = getQueueByPath(decodedQueuePath);
      if (queue) {
        // Queue exists, open the panel
        setPropertyPanelOpen(true);
      } else {
        // Queue doesn't exist - invalid path
        console.warn(`Queue not found: ${decodedQueuePath}. Panel will not open.`);
        setPropertyPanelOpen(false);
      }
    } else {
      setPropertyPanelOpen(false);
    }
  }, [queuePath, panel, selectQueue, setPropertyPanelOpen, selectedQueuePath, getQueueByPath, isLoading]);

  return (
    <AppLayout>
      <QueueVisualizationContainer />
      {/* PropertyPanel is rendered globally via the layout, URL state managed above */}
    </AppLayout>
  );
}