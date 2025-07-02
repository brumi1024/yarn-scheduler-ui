import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueueContextMenu } from '../QueueContextMenu';
import { useQueueActions } from '../../hooks/useQueueActions';

// Mock the hooks and dialogs
vi.mock('../../hooks/useQueueActions');
vi.mock('../../dialogs/AddQueueDialog', () => ({
    AddQueueDialog: vi.fn(({ open, onClose }) =>
        open ? <div data-testid="add-queue-dialog">Add Queue Dialog</div> : null
    ),
}));
vi.mock('../../dialogs/DeleteQueueDialog', () => ({
    DeleteQueueDialog: vi.fn(({ open, onClose }) =>
        open ? <div data-testid="delete-queue-dialog">Delete Queue Dialog</div> : null
    ),
}));

describe('QueueContextMenu', () => {
    const mockUseQueueActions = {
        canAddChildQueue: vi.fn(),
        canDeleteQueue: vi.fn(),
        updateQueueProperty: vi.fn(),
    };

    const defaultProps = {
        anchorEl: document.createElement('div'),
        open: true,
        onClose: vi.fn(),
        queuePath: 'root.default',
        queueState: 'RUNNING',
        onEditProperties: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useQueueActions as any).mockReturnValue(mockUseQueueActions);
        mockUseQueueActions.canAddChildQueue.mockReturnValue(true);
        mockUseQueueActions.canDeleteQueue.mockReturnValue(true);
    });

    it('should render all menu items when queue can add children and be deleted', () => {
        render(<QueueContextMenu {...defaultProps} />);

        expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
        expect(screen.getByText('Edit Properties')).toBeInTheDocument();
        expect(screen.getByText('Stop Queue')).toBeInTheDocument();
        expect(screen.getByText('Delete Queue')).toBeInTheDocument();
    });

    it('should not show Add Child Queue when canAddChildQueue returns false', () => {
        mockUseQueueActions.canAddChildQueue.mockReturnValue(false);

        render(<QueueContextMenu {...defaultProps} />);

        expect(screen.queryByText('Add Child Queue')).not.toBeInTheDocument();
        expect(screen.getByText('Edit Properties')).toBeInTheDocument();
    });

    it('should not show Delete Queue when canDeleteQueue returns false', () => {
        mockUseQueueActions.canDeleteQueue.mockReturnValue(false);

        render(<QueueContextMenu {...defaultProps} />);

        expect(screen.queryByText('Delete Queue')).not.toBeInTheDocument();
        expect(screen.getByText('Edit Properties')).toBeInTheDocument();
    });

    it('should show Start Queue when queue state is STOPPED', () => {
        render(<QueueContextMenu {...defaultProps} queueState="STOPPED" />);

        expect(screen.getByText('Start Queue')).toBeInTheDocument();
        expect(screen.queryByText('Stop Queue')).not.toBeInTheDocument();
    });

    it('should open Add Queue dialog when Add Child Queue is clicked', () => {
        render(<QueueContextMenu {...defaultProps} />);

        fireEvent.click(screen.getByText('Add Child Queue'));

        expect(screen.getByTestId('add-queue-dialog')).toBeInTheDocument();
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should open Delete Queue dialog when Delete Queue is clicked', () => {
        render(<QueueContextMenu {...defaultProps} />);

        fireEvent.click(screen.getByText('Delete Queue'));

        expect(screen.getByTestId('delete-queue-dialog')).toBeInTheDocument();
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should toggle queue state when Stop/Start Queue is clicked', () => {
        render(<QueueContextMenu {...defaultProps} />);

        fireEvent.click(screen.getByText('Stop Queue'));

        expect(mockUseQueueActions.updateQueueProperty).toHaveBeenCalledWith(
            'root.default',
            'state',
            'STOPPED'
        );
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onEditProperties when Edit Properties is clicked', () => {
        render(<QueueContextMenu {...defaultProps} />);

        fireEvent.click(screen.getByText('Edit Properties'));

        expect(defaultProps.onEditProperties).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});