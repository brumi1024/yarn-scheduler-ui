import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TabNavigation from './TabNavigation';

describe('TabNavigation', () => {
  it('renders all navigation tabs', () => {
    const mockOnTabChange = vi.fn();
    render(<TabNavigation activeTab={0} onTabChange={mockOnTabChange} />);
    
    expect(screen.getByText('Queues')).toBeInTheDocument();
    expect(screen.getByText('Global Settings')).toBeInTheDocument();
    expect(screen.getByText('Node Labels')).toBeInTheDocument();
    expect(screen.getByText('Diagnostics')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', () => {
    const mockOnTabChange = vi.fn();
    render(<TabNavigation activeTab={0} onTabChange={mockOnTabChange} />);
    
    fireEvent.click(screen.getByText('Global Settings'));
    expect(mockOnTabChange).toHaveBeenCalledWith(1);
  });

  it('highlights the active tab', () => {
    const mockOnTabChange = vi.fn();
    render(<TabNavigation activeTab={1} onTabChange={mockOnTabChange} />);
    
    const globalSettingsTab = screen.getByText('Global Settings').closest('[role="tab"]');
    expect(globalSettingsTab).toHaveAttribute('aria-selected', 'true');
  });
});