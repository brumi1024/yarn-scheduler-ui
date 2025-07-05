import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonTable } from './ComparisonTable';
import type { ComparisonData } from '../utils/comparison';

describe('ComparisonTable', () => {
  const mockData: ComparisonData = {
    queues: ['root.default', 'root.production'],
    properties: new Map([
      [
        'capacity',
        new Map([
          ['root.default', '50'],
          ['root.production', '60'],
        ]),
      ],
      [
        'maximum-capacity',
        new Map([
          ['root.default', '100'],
          ['root.production', '100'],
        ]),
      ],
      [
        'user-limit-factor',
        new Map([
          ['root.default', '1'],
          ['root.production', undefined],
        ]),
      ],
    ]),
    differences: new Set(['capacity', 'user-limit-factor']),
  };

  it('should render queue names in header', () => {
    render(<ComparisonTable data={mockData} />);

    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('should render property names with formatting', () => {
    render(<ComparisonTable data={mockData} />);

    // Use getAllByText since "Capacity" appears both as category and property
    const capacityElements = screen.getAllByText('Capacity');
    expect(capacityElements).toHaveLength(2); // One for category, one for property

    expect(screen.getByText('Maximum Capacity')).toBeInTheDocument();
    expect(screen.getByText('User Limit Factor')).toBeInTheDocument();
  });

  it('should render property values', () => {
    render(<ComparisonTable data={mockData} />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getAllByText('100')).toHaveLength(2);
  });

  it('should show "Not set" for undefined values', () => {
    render(<ComparisonTable data={mockData} />);

    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('should show "Differs" badge for properties with differences', () => {
    render(<ComparisonTable data={mockData} />);

    const differsBadges = screen.getAllByText('Differs');
    expect(differsBadges).toHaveLength(2); // capacity and user-limit-factor
  });

  it('should group properties by category', () => {
    render(<ComparisonTable data={mockData} />);

    // Check for category headers (they appear as table cells with colspan)
    const categoryHeaders = screen.getAllByText((content, element) => {
      return (
        element?.getAttribute('colspan') === '3' &&
        (content === 'Capacity' || content === 'User Limits')
      );
    });
    expect(categoryHeaders).toHaveLength(2);
  });

  it('should handle empty data', () => {
    const emptyData: ComparisonData = {
      queues: [],
      properties: new Map(),
      differences: new Set(),
    };

    render(<ComparisonTable data={emptyData} />);

    expect(screen.getByText('Property')).toBeInTheDocument();
  });

  it('should render table structure correctly', () => {
    const { container } = render(<ComparisonTable data={mockData} />);

    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();

    const headers = container.querySelectorAll('th');
    expect(headers.length).toBeGreaterThan(0);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });
});
