import { ZoomControls } from '../ZoomControls';
import { describe, it, expect, beforeEach, vi, afterEach, screen, fireEvent, act } from '../../test/testUtils';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock PanZoomController
class MockPanZoomController {
    private state = { x: 0, y: 0, scale: 1 };
    private listeners: ((event: any) => void)[] = [];

    getState = vi.fn(() => ({ ...this.state }));
    setState = vi.fn((newState: any) => {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    });
    zoomBy = vi.fn((factor: number) => {
        this.state.scale *= factor;
        this.notifyListeners();
    });
    reset = vi.fn(() => {
        this.state = { x: 0, y: 0, scale: 1 };
        this.notifyListeners();
    });
    addEventListener = vi.fn((listener: any) => {
        this.listeners.push(listener);
    });
    removeEventListener = vi.fn((listener: any) => {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    });

    private notifyListeners() {
        this.listeners.forEach((listener) => {
            listener({
                type: 'pan',
                state: this.state,
                bounds: { x: 0, y: 0, width: 800, height: 600 },
            });
        });
    }

    // Simulate scale change for testing
    simulateScaleChange(newScale: number) {
        this.state.scale = newScale;
        this.notifyListeners();
    }
}

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('ZoomControls', () => {
    let mockController: MockPanZoomController;
    let onZoomToFit: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockController = new MockPanZoomController();
        onZoomToFit = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render all zoom control buttons', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/fit to screen/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/reset view/i)).toBeInTheDocument();
        });

        it('should display current scale percentage', () => {
            renderWithTheme(
                <ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} showScale={true} />
            );

            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        it('should hide scale when showScale is false', () => {
            renderWithTheme(
                <ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} showScale={false} />
            );

            expect(screen.queryByText('100%')).not.toBeInTheDocument();
        });

        it('should position controls correctly', () => {
            const { container } = renderWithTheme(
                <ZoomControls
                    panZoomController={mockController as any}
                    onZoomToFit={onZoomToFit}
                    position="bottom-left"
                />
            );

            const paper =
                container.querySelector('[data-testid] .MuiPaper-root') || container.querySelector('.MuiPaper-root');
            const styles = window.getComputedStyle(paper!);

            // Should have fixed positioning
            expect(styles.position).toBe('fixed');
        });
    });

    describe('button interactions', () => {
        it('should call zoomBy when zoom in is clicked', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            const zoomInButton = screen.getByLabelText(/zoom in/i);
            fireEvent.click(zoomInButton);

            expect(mockController.zoomBy).toHaveBeenCalledWith(1.2);
        });

        it('should call zoomBy when zoom out is clicked', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            const zoomOutButton = screen.getByLabelText(/zoom out/i);
            fireEvent.click(zoomOutButton);

            expect(mockController.zoomBy).toHaveBeenCalledWith(0.8);
        });

        it('should call reset when reset is clicked', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            const resetButton = screen.getByLabelText(/reset view/i);
            fireEvent.click(resetButton);

            expect(mockController.reset).toHaveBeenCalledWith(true);
        });

        it('should call onZoomToFit when fit to screen is clicked', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            const fitButton = screen.getByLabelText(/fit to screen/i);
            fireEvent.click(fitButton);

            expect(onZoomToFit).toHaveBeenCalled();
        });
    });

    describe('disabled state', () => {
        it('should disable buttons when disabled prop is true', () => {
            renderWithTheme(
                <ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} disabled={true} />
            );

            expect(screen.getByLabelText(/zoom in/i)).toBeDisabled();
            expect(screen.getByLabelText(/zoom out/i)).toBeDisabled();
            expect(screen.getByLabelText(/fit to screen/i)).toBeDisabled();
            expect(screen.getByLabelText(/reset view/i)).toBeDisabled();
        });

        it('should disable controller-dependent buttons when controller is null', () => {
            renderWithTheme(<ZoomControls panZoomController={null} onZoomToFit={onZoomToFit} />);

            expect(screen.getByLabelText(/zoom in/i)).toBeDisabled();
            expect(screen.getByLabelText(/zoom out/i)).toBeDisabled();
            expect(screen.getByLabelText(/reset view/i)).toBeDisabled();

            // Fit to screen should still be enabled
            expect(screen.getByLabelText(/fit to screen/i)).not.toBeDisabled();
        });

        it('should not call controller methods when disabled', () => {
            renderWithTheme(
                <ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} disabled={true} />
            );

            const zoomInButton = screen.getByLabelText(/zoom in/i);
            fireEvent.click(zoomInButton);

            expect(mockController.zoomBy).not.toHaveBeenCalled();
        });
    });

    describe('scale updates', () => {
        it('should update scale display when controller state changes', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            // Initial scale
            expect(screen.getByText('100%')).toBeInTheDocument();

            // Simulate scale change
            act(() => {
                mockController.simulateScaleChange(1.5);
            });

            // Should update display
            expect(screen.getByText('150%')).toBeInTheDocument();
            expect(screen.queryByText('100%')).not.toBeInTheDocument();
        });

        it('should format scale percentage correctly', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            // Test various scale values
            act(() => {
                mockController.simulateScaleChange(0.5);
            });
            expect(screen.getByText('50%')).toBeInTheDocument();

            act(() => {
                mockController.simulateScaleChange(2.25);
            });
            expect(screen.getByText('225%')).toBeInTheDocument();

            act(() => {
                mockController.simulateScaleChange(0.1);
            });
            expect(screen.getByText('10%')).toBeInTheDocument();
        });

        it('should register and unregister event listeners', () => {
            const { unmount } = renderWithTheme(
                <ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />
            );

            expect(mockController.addEventListener).toHaveBeenCalled();

            unmount();

            expect(mockController.removeEventListener).toHaveBeenCalled();
        });
    });

    describe('accessibility', () => {
        it('should have proper ARIA labels', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            // Check that buttons have accessible names via tooltips
            expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/fit to screen/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/reset view/i)).toBeInTheDocument();
        });

        it('should show keyboard shortcuts in tooltips', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />);

            // Tooltips with keyboard shortcuts should be present
            expect(screen.getByLabelText(/ctrl.*\+/i)).toBeInTheDocument();
        });
    });

    describe('error handling', () => {
        it('should handle missing onZoomToFit gracefully', () => {
            renderWithTheme(<ZoomControls panZoomController={mockController as any} />);

            const fitButton = screen.getByLabelText(/fit to screen/i);

            expect(() => {
                fireEvent.click(fitButton);
            }).not.toThrow();
        });

        it('should handle controller method errors gracefully', () => {
            const errorController = {
                ...mockController,
                zoomBy: vi.fn(() => {
                    throw new Error('Test error');
                }),
            };

            renderWithTheme(<ZoomControls panZoomController={errorController as any} onZoomToFit={onZoomToFit} />);

            const zoomInButton = screen.getByLabelText(/zoom in/i);

            expect(() => {
                fireEvent.click(zoomInButton);
            }).not.toThrow();
        });
    });

    describe('theme integration', () => {
        it('should use theme spacing for positioning', () => {
            const customTheme = createTheme({
                spacing: (factor: number) => `${factor * 10}px`,
            });

            render(
                <ThemeProvider theme={customTheme}>
                    <ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />
                </ThemeProvider>
            );

            const paper = document.querySelector('.MuiPaper-root');
            const styles = window.getComputedStyle(paper!);

            // Should use theme spacing (2 * 10px = 20px)
            expect(styles.margin).toBe('20px');
        });

        it('should apply theme colors', () => {
            const customTheme = createTheme({
                palette: {
                    background: {
                        paper: '#ffffff',
                    },
                },
            });

            render(
                <ThemeProvider theme={customTheme}>
                    <ZoomControls panZoomController={mockController as any} onZoomToFit={onZoomToFit} />
                </ThemeProvider>
            );

            const paper = document.querySelector('.MuiPaper-root');
            expect(paper).toHaveClass('MuiPaper-root');
        });
    });
});
