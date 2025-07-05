export interface ComparisonData {
  queues: string[];
  properties: Map<string, Map<string, string | undefined>>; // property -> queue -> value
  differences: Set<string>; // properties that differ
}

export const buildComparisonData = (
  configs: Map<string, Record<string, string>>,
): ComparisonData => {
  const queues = Array.from(configs.keys());
  const properties = new Map<string, Map<string, string | undefined>>();
  const differences = new Set<string>();

  // Collect all unique properties
  const allProperties = new Set<string>();
  configs.forEach((config) => {
    Object.keys(config).forEach((prop) => allProperties.add(prop));
  });

  // Build comparison matrix
  allProperties.forEach((prop) => {
    const propValues = new Map<string, string | undefined>();
    let hasDifference = false;
    let firstValue: string | undefined;

    queues.forEach((queue, index) => {
      const value = configs.get(queue)?.[prop];
      propValues.set(queue, value);

      if (index === 0) {
        firstValue = value;
      } else if (value !== firstValue) {
        hasDifference = true;
      }
    });

    properties.set(prop, propValues);
    if (hasDifference) {
      differences.add(prop);
    }
  });

  return { queues, properties, differences };
};

export const getPropertyCategory = (property: string): string => {
  if (property.startsWith('accessible-node-labels')) return 'Node Labels';
  if (property.includes('resource')) return 'Resources';
  if (property.includes('application')) return 'Applications';
  if (['capacity', 'maximum-capacity'].includes(property)) {
    return 'Capacity';
  }
  if (property.includes('user')) return 'User Limits';
  return 'General';
};

export const formatPropertyName = (property: string): string => {
  return property
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const exportComparison = (data: ComparisonData) => {
  const { queues, properties } = data;

  // CSV format
  const csv = [
    ['Property', ...queues].join(','),
    ...Array.from(properties.entries()).map(([prop, values]) => {
      const row = [prop];
      queues.forEach((queue) => {
        row.push(values.get(queue) || '');
      });
      return row.map((cell) => `"${cell}"`).join(',');
    }),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `queue-comparison-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
