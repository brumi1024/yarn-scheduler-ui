import React from 'react';
import { Tag } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSchedulerStore } from '~/stores/schedulerStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';

export const NodeLabelSelector: React.FC = () => {
  // State values (trigger re-renders only when these specific values change)
  const { nodeLabels, selectedNodeLabelFilter } = useSchedulerStore(
    useShallow((s) => ({
      nodeLabels: s.nodeLabels,
      selectedNodeLabelFilter: s.selectedNodeLabelFilter,
    })),
  );

  // Actions (stable references, never trigger re-renders)
  const selectNodeLabelFilter = useSchedulerStore((s) => s.selectNodeLabelFilter);

  const handleChange = (value: string) => {
    selectNodeLabelFilter(value === 'DEFAULT' ? '' : value);
  };

  return (
    <div className="flex items-center gap-2">
      <Tag className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedNodeLabelFilter || 'DEFAULT'} onValueChange={handleChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select node label" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DEFAULT">
            <span>Default Partition</span>
          </SelectItem>
          {nodeLabels.map((label) => (
            <SelectItem key={label.name} value={label.name}>
              <div className="flex items-center gap-2">
                <span>{label.name}</span>
                {label.exclusivity && (
                  <Badge variant="secondary" className="text-xs">
                    Exclusive
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
