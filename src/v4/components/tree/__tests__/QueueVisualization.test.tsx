import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueueVisualization } from '../QueueVisualization';

// Mock the QueueVisualizationContainer to avoid complex setup
vi.mock('../QueueVisualizationContainer', () => ({
    QueueVisualizationContainer: vi.fn(({ className }) => (
        <div data-testid="queue-visualization-container" className={className}>
            Mocked Container
        </div>
    )),
}));

describe('QueueVisualization', () => {
    it('should render without crashing', () => {
        const { container } = render(<QueueVisualization />);
        expect(container).toBeTruthy();
    });

    it('should pass through className prop to container', () => {
        const testClassName = 'test-custom-class';
        render(<QueueVisualization className={testClassName} />);
        
        const container = screen.getByTestId('queue-visualization-container');
        expect(container).toHaveClass(testClassName);
    });

    it('should render QueueVisualizationContainer', () => {
        render(<QueueVisualization />);
        
        const container = screen.getByTestId('queue-visualization-container');
        expect(container).toBeInTheDocument();
        expect(container).toHaveTextContent('Mocked Container');
    });
});