import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NodeLabelsPanel } from '../NodeLabelsPanel';

// Simple inline mock
vi.mock('../../../store/schedulerStore', () => ({
    useSchedulerStore: (selector: any) => {
        const state = {
            nodeLabels: [
                { name: 'gpu', exclusivity: true },
                { name: 'ssd', exclusivity: false },
                { name: 'highmem', exclusivity: true },
            ],
            selectedNodeLabel: null,
            selectNodeLabel: vi.fn(),
            addNodeLabel: vi.fn(),
            removeNodeLabel: vi.fn(),
            stagedChanges: [],
            isLoading: false,
            nodes: [],
            nodeToLabels: [],
            assignNodeToLabel: vi.fn(),
        };
        return selector(state);
    },
}));

describe('NodeLabelsPanel', () => {
    it('should render all node labels', () => {
        render(<NodeLabelsPanel />);
        
        expect(screen.getByText('gpu')).toBeInTheDocument();
        expect(screen.getByText('ssd')).toBeInTheDocument();
        expect(screen.getByText('highmem')).toBeInTheDocument();
    });

    it('should show label count', () => {
        render(<NodeLabelsPanel />);
        
        expect(screen.getByText('3 labels available')).toBeInTheDocument();
    });
});