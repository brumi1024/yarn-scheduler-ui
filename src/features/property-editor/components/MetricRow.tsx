import type { ReactNode } from 'react';

export type MetricRowProps = {
  label: string;
  value: ReactNode;
  tooltip?: string;
};

/**
 * MetricRow component for displaying label-value pairs consistently
 * Used in queue overview and info tabs
 */
export const MetricRow = ({ label, value, tooltip }: MetricRowProps) => {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground" title={tooltip}>
        {label}:
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
};
