import type { ResourceInfo } from '~/types/resource';
import { Badge } from '~/components/ui/badge';
import { formatMemory } from '~/utils/formatUtils';

export type ResourceDisplayProps = {
  resources: ResourceInfo | undefined;
  fallback?: string;
  className?: string;
};

/**
 * ResourceDisplay component for displaying resources as badges
 * Displays resources as separate badges: [16 GB] [8 vCores]
 */
export const ResourceDisplay = ({
  resources,
  fallback = 'N/A',
  className = '',
}: ResourceDisplayProps) => {
  if (!resources) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <Badge variant="secondary" className="font-normal">
        {formatMemory(resources.memory)}
      </Badge>
      <Badge variant="secondary" className="font-normal">
        {resources.vCores} vCores
      </Badge>
    </div>
  );
};
