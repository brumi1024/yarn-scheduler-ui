import { useState } from 'react';
import { FileDown } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useSchedulerStore } from '~/stores/schedulerStore';

type DiagnosticDatasetId =
  | 'schedulerConf'
  | 'schedulerInfo'
  | 'nodeLabels'
  | 'nodeToLabels'
  | 'nodes'
  | 'schedulerIssue';

interface DiagnosticOption {
  id: DiagnosticDatasetId;
  label: string;
  description: string;
  data: unknown;
}

const DEFAULT_SELECTED: DiagnosticDatasetId[] = ['schedulerConf', 'schedulerInfo'];

export function DiagnosticsDialog() {
  const configData = useSchedulerStore((state) => state.configData);
  const configVersion = useSchedulerStore((state) => state.configVersion);
  const schedulerData = useSchedulerStore((state) => state.schedulerData);
  const nodeLabels = useSchedulerStore((state) => state.nodeLabels);
  const nodeToLabels = useSchedulerStore((state) => state.nodeToLabels);
  const nodes = useSchedulerStore((state) => state.nodes);
  const schedulerIssueData = useSchedulerStore((state) => state.schedulerIssueData);

  const [open, setOpen] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState<DiagnosticDatasetId[]>(DEFAULT_SELECTED);

  const entries = Array.from(configData.entries()).sort(([a], [b]) => a.localeCompare(b));
  const schedulerConfiguration = {
    version: configVersion,
    properties: Object.fromEntries(entries),
  };

  const datasetOptions: DiagnosticOption[] = [
    {
      id: 'schedulerConf',
      label: 'Scheduler Configuration',
      description: 'Key/value pairs returned by /scheduler-conf (including version metadata).',
      data: schedulerConfiguration,
    },
    {
      id: 'schedulerInfo',
      label: 'Scheduler Info',
      description: 'Current scheduler metrics returned by /scheduler.',
      data: schedulerData,
    },
    {
      id: 'nodeLabels',
      label: 'Node Labels',
      description: 'Label definitions from /node-labels.',
      data: nodeLabels,
    },
    {
      id: 'nodeToLabels',
      label: 'Node-to-Labels Mapping',
      description: 'Assignments from /node-to-labels.',
      data: nodeToLabels,
    },
    {
      id: 'nodes',
      label: 'Nodes',
      description: 'Node metadata returned by /nodes.',
      data: nodes,
    },
    {
      id: 'schedulerIssue',
      label: 'Scheduler Related Issue',
      description:
        'ResourceManager Scheduler Logs with DEBUG enabled for 2 minutes,' +
        'Multiple Jstack of ResourceManager,' +
        'YARN and Scheduler Configuration,' +
        'Cluster Scheduler API /ws/v1/cluster/scheduler and Cluster Nodes API /ws/v1/cluster/nodes response,' +
        'Scheduler Activities /ws/v1/cluster/scheduler/bulk-activities response.',
      data: schedulerIssueData,
    },
  ];

  const toggleDataset = (datasetId: DiagnosticDatasetId, checked: boolean) => {
    setSelectedDatasets((prev) => {
      if (checked) {
        return prev.includes(datasetId) ? prev : [...prev, datasetId];
      }
      return prev.filter((id) => id !== datasetId);
    });
  };

  const handleDownload = () => {
    if (selectedDatasets.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const payload: Record<string, unknown> = {
      generatedAt: timestamp,
      datasets: {},
    };

    for (const option of datasetOptions) {
      if (selectedDatasets.includes(option.id)) {
        (payload.datasets as Record<string, unknown>)[option.id] = option.data;
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `yarn-diagnostics-${timestamp.replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const isDownloadDisabled = selectedDatasets.length === 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Download diagnostics">
                <FileDown className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Download diagnostics</TooltipContent>
        </Tooltip>

        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Download diagnostics</DialogTitle>
            <DialogDescription>
              Choose which YARN API responses to include in the diagnostic bundle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {datasetOptions.map((option) => {
              const checkboxId = `diagnostic-${option.id}`;
              const isChecked = selectedDatasets.includes(option.id);

              return (
                <div
                  key={option.id}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <Checkbox
                    id={checkboxId}
                    className="mt-1"
                    checked={isChecked}
                    onCheckedChange={(value) => toggleDataset(option.id, value === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={checkboxId} className="text-sm font-medium leading-none">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Data reflects the current in-memory store values.
            </p>
            <Button onClick={handleDownload} disabled={isDownloadDisabled}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
