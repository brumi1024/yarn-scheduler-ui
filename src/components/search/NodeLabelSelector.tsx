import React from 'react';
import { Tag } from 'lucide-react';
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
  const { nodeLabels, selectedNodeLabelFilter, selectNodeLabelFilter } = useSchedulerStore();

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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
              <span>All Partitions</span>
            </div>
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
