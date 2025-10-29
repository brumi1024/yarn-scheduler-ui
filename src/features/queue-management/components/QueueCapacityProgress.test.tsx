import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueueCapacityProgress } from './QueueCapacityProgress';

describe('QueueCapacityProgress', () => {
  it('renders usage header and default formatter', () => {
    render(
      <QueueCapacityProgress capacity={60} maxCapacity={80} usedCapacity={70} className="test" />,
    );

    expect(screen.getByText('Live Resource Usage')).toBeInTheDocument();
    expect(screen.getByText('70.0% used')).toBeInTheDocument();
  });

  it('shows capacity and max capacity markers with distinct styling', () => {
    render(<QueueCapacityProgress capacity={40} maxCapacity={85} usedCapacity={92} showHeader />);

    const capacityMarker = screen.getByText('40%');
    const maxCapacityMarker = screen.getByText('85%');
    expect(capacityMarker).toBeInTheDocument();
    expect(maxCapacityMarker).toBeInTheDocument();

    const usageBar = document.querySelector('.bg-destructive');
    expect(usageBar).not.toBeNull();
  });
});
