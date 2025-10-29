import React, { useMemo } from 'react';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/utils/cn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { ComparisonData } from '../utils/comparison';
import { getPropertyCategory, formatPropertyName } from '../utils/comparison';

interface ComparisonTableProps {
  data: ComparisonData;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ data }) => {
  'use memo';
  const { properties, queues, differences } = data;

  // Group properties by category
  const groupedProperties = useMemo(() => {
    const groups = new Map<string, string[]>();

    properties.forEach((_, prop) => {
      const category = getPropertyCategory(prop);
      const props = groups.get(category) || [];
      props.push(prop);
      groups.set(category, props);
    });

    return groups;
  }, [properties]);

  return (
    <div className="w-full h-full">
      <Table className="border rounded-lg">
        <TableHeader className="sticky top-0 z-20 bg-background">
          <TableRow>
            <TableHead className="sticky left-0 z-30 bg-background border-r px-4 py-3 text-left font-medium w-64 min-w-[16rem] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
              Property
            </TableHead>
            {queues.map((queue) => (
              <TableHead
                key={queue}
                className="px-4 py-3 text-left font-medium min-w-[300px] bg-background"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-base">{queue.split('.').pop()}</span>
                  <Badge variant="outline" className="text-xs w-fit font-normal">
                    {queue}
                  </Badge>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(groupedProperties.entries()).map(([category, props]) => (
            <React.Fragment key={category}>
              <TableRow>
                <TableCell
                  colSpan={queues.length + 1}
                  className="sticky left-0 bg-muted font-semibold text-sm px-4 py-2"
                >
                  {category}
                </TableCell>
              </TableRow>
              {props.map((prop) => {
                const values = properties.get(prop)!;
                const isDifferent = differences.has(prop);

                return (
                  <TableRow key={prop}>
                    <TableCell className="sticky left-0 z-10 bg-background border-r px-4 py-3 font-medium min-w-[16rem] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-2 pr-2">
                        <span className="truncate">{formatPropertyName(prop)}</span>
                        {isDifferent && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Differs
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {queues.map((queue) => {
                      const value = values.get(queue);
                      return (
                        <TableCell
                          key={queue}
                          className={cn(
                            'px-4 py-3 min-w-[300px]',
                            isDifferent && 'bg-blue-50 dark:bg-blue-950/20',
                          )}
                        >
                          {value !== undefined ? (
                            <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                              {value}
                            </code>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">Not set</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
