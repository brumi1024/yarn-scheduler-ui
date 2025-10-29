import React, { useState } from 'react';
import { Tag, Plus, Trash2, Shield } from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { validateLabelRemoval } from '~/features/node-labels/utils/labelValidation';
import { AddLabelDialog } from '~/features/node-labels';

export const NodeLabelsPanel: React.FC = () => {
  const {
    nodeLabels,
    selectedNodeLabel,
    selectNodeLabel,
    addNodeLabel,
    removeNodeLabel,
    isLoading,
  } = useSchedulerStore();

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleAddLabel = async (name: string, exclusivity: boolean) => {
    try {
      await addNodeLabel(name, exclusivity);
    } catch (error) {
      console.error('Failed to add node label:', error);
      // Error is already set in the store, will be displayed by parent component
    }
  };

  const handleRemoveLabel = async (labelName: string) => {
    try {
      // Get nodeToLabels from store to create nodeAssignments Map for validation
      const nodeToLabels = useSchedulerStore.getState().nodeToLabels;
      const nodeAssignments = new Map<string, string[]>();

      nodeToLabels.forEach((mapping) => {
        nodeAssignments.set(mapping.nodeId, mapping.nodeLabels);
      });

      // Validate that the label can be safely removed
      const validation = validateLabelRemoval(labelName, nodeAssignments);

      if (!validation.valid) {
        // Show error message
        throw new Error(validation.error || 'Cannot remove label');
      }

      await removeNodeLabel(labelName);
    } catch (error) {
      console.error('Failed to remove node label:', error);
      // Error is already set in the store, will be displayed by parent component
    }
  };

  const handleLabelSelect = (labelName: string) => {
    selectNodeLabel(labelName === selectedNodeLabel ? null : labelName);
  };

  const existingLabelNames = nodeLabels.map((label) => label.name);

  return (
    <TooltipProvider>
      <div>
        {/* Add Label Button */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {nodeLabels.length} label{nodeLabels.length !== 1 ? 's' : ''} available
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            disabled={isLoading}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Labels List */}
        <ul className="space-y-1">
          {nodeLabels.map((label) => {
            const isSelected = selectedNodeLabel === label.name;

            return (
              <li key={label.name}>
                <div
                  className={`
                                        group flex cursor-pointer items-center justify-between rounded-md px-3 py-2
                                        transition-colors hover:bg-accent
                                        ${isSelected ? 'bg-accent' : ''}
                                    `}
                  onClick={() => handleLabelSelect(label.name)}
                >
                  <div className="flex items-center gap-3">
                    {label.exclusivity ? (
                      <Shield className="h-4 w-4 text-warning" />
                    ) : (
                      <Tag className="h-4 w-4 text-primary" />
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isSelected ? 'font-semibold' : ''}`}>
                        {label.name}
                      </span>

                      {label.exclusivity && (
                        <Badge variant="outline" className="border-warning text-warning">
                          Exclusive
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLabel(label.name);
                        }}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove label</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </li>
            );
          })}

          {nodeLabels.length === 0 && (
            <li>
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No node labels found</p>
                <p className="text-xs text-muted-foreground">
                  Click "Add" to create the first label
                </p>
              </div>
            </li>
          )}
        </ul>

        <AddLabelDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onConfirm={handleAddLabel}
          existingLabels={existingLabelNames}
          isLoading={isLoading}
        />
      </div>
    </TooltipProvider>
  );
};
