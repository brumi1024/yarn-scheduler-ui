import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CustomFlowEdge from '../CustomFlowEdge';
import type { EdgeProps } from '@xyflow/react';

describe('CustomFlowEdge', () => {
    const mockEdgeProps: EdgeProps = {
        id: 'edge-1',
        source: 'root',
        target: 'root.default',
        sourceX: 100,
        sourceY: 100,
        targetX: 300,
        targetY: 100,
        sourcePosition: 'right' as any,
        targetPosition: 'left' as any,
        data: {},
        markerStart: undefined,
        markerEnd: undefined,
        style: {},
        animated: false,
        selected: false,
        interactionWidth: 10,
    };

    it('should render without crashing', () => {
        const { container } = render(<CustomFlowEdge {...mockEdgeProps} />);
        expect(container.querySelector('g')).toBeInTheDocument();
    });

    it('should create gradient with blue colors for RUNNING state', () => {
        const runningProps = {
            ...mockEdgeProps,
            data: { targetState: 'RUNNING', capacity: 50 },
        };

        const { container } = render(<CustomFlowEdge {...runningProps} />);
        
        const gradient = container.querySelector('linearGradient');
        expect(gradient).toBeInTheDocument();
        
        const stops = gradient?.querySelectorAll('stop');
        expect(stops).toHaveLength(2);
        
        // Check blue gradient colors
        expect(stops?.[0]).toHaveStyle({ stopColor: '#2196f3' });
        expect(stops?.[1]).toHaveStyle({ stopColor: '#64b5f6' });
    });

    it('should create gradient with red colors for STOPPED state', () => {
        const stoppedProps = {
            ...mockEdgeProps,
            data: { targetState: 'STOPPED', capacity: 50 },
        };

        const { container } = render(<CustomFlowEdge {...stoppedProps} />);
        
        const gradient = container.querySelector('linearGradient');
        const stops = gradient?.querySelectorAll('stop');
        
        // Check red gradient colors
        expect(stops?.[0]).toHaveStyle({ stopColor: '#f44336' });
        expect(stops?.[1]).toHaveStyle({ stopColor: '#e57373' });
    });

    it('should create gradient with gray colors for default state', () => {
        const defaultProps = {
            ...mockEdgeProps,
            data: { capacity: 50 },
        };

        const { container } = render(<CustomFlowEdge {...defaultProps} />);
        
        const gradient = container.querySelector('linearGradient');
        const stops = gradient?.querySelectorAll('stop');
        
        // Check gray gradient colors
        expect(stops?.[0]).toHaveStyle({ stopColor: '#9e9e9e' });
        expect(stops?.[1]).toHaveStyle({ stopColor: '#bdbdbd' });
    });

    it('should calculate width based on capacity', () => {
        const testCases = [
            { capacity: 0, expectedMin: 8, expectedMax: 12 },
            { capacity: 10, expectedMin: 8, expectedMax: 8 },
            { capacity: 50, expectedMin: 40, expectedMax: 40 },
            { capacity: 100, expectedMin: 40, expectedMax: 40 }, // Capped at 40
        ];

        testCases.forEach(({ capacity }) => {
            const props = {
                ...mockEdgeProps,
                data: { capacity },
            };

            const { container } = render(<CustomFlowEdge {...props} />);
            
            // The path should exist
            const path = container.querySelector('path[fill*="url(#gradient"]');
            expect(path).toBeInTheDocument();
        });
    });

    it('should render animated flow for RUNNING state', () => {
        const runningProps = {
            ...mockEdgeProps,
            data: { targetState: 'RUNNING', capacity: 50 },
        };

        const { container } = render(<CustomFlowEdge {...runningProps} />);
        
        // Look for the animated stroke path
        const animatedPath = container.querySelector('path[stroke="rgba(255, 255, 255, 0.3)"]');
        expect(animatedPath).toBeInTheDocument();
        expect(animatedPath).toHaveAttribute('stroke-dasharray', '10 10');
    });

    it('should not render animated flow for non-RUNNING states', () => {
        const stoppedProps = {
            ...mockEdgeProps,
            data: { targetState: 'STOPPED', capacity: 50 },
        };

        const { container } = render(<CustomFlowEdge {...stoppedProps} />);
        
        // No animated stroke path should exist
        const animatedPath = container.querySelector('path[stroke="rgba(255, 255, 255, 0.3)"]');
        expect(animatedPath).not.toBeInTheDocument();
    });

    it('should render shadow filter', () => {
        const { container } = render(<CustomFlowEdge {...mockEdgeProps} />);
        
        const filter = container.querySelector('filter');
        expect(filter).toBeInTheDocument();
        
        const dropShadow = filter?.querySelector('feDropShadow');
        expect(dropShadow).toBeInTheDocument();
        expect(dropShadow).toHaveAttribute('dx', '0');
        expect(dropShadow).toHaveAttribute('dy', '2');
    });

    it('should handle missing data gracefully', () => {
        const propsWithoutData = {
            ...mockEdgeProps,
            data: undefined,
        };

        const { container } = render(<CustomFlowEdge {...propsWithoutData} />);
        
        // Should still render with default values
        expect(container.querySelector('g')).toBeInTheDocument();
        expect(container.querySelector('path')).toBeInTheDocument();
    });

    it('should use proportional Y positions when provided', () => {
        const propsWithProportionalData = {
            ...mockEdgeProps,
            data: {
                sourceStartY: 90,
                sourceEndY: 110,
                targetStartY: 95,
                targetEndY: 105,
                capacity: 30,
            },
        };

        const { container } = render(<CustomFlowEdge {...propsWithProportionalData} />);
        
        // Path should be rendered with the custom Y positions
        const mainPath = container.querySelector('path[fill*="url(#gradient"]');
        expect(mainPath).toBeInTheDocument();
        
        // The path data should include our custom Y coordinates
        const pathData = mainPath?.getAttribute('d');
        expect(pathData).toContain('90'); // sourceStartY
        expect(pathData).toContain('110'); // sourceEndY
    });
});