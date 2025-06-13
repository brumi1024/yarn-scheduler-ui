import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Box, Alert, AlertTitle, Button, Typography, Collapse } from '@mui/material';
import { ErrorOutline, ExpandMore, ExpandLess, Refresh } from '@mui/icons-material';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    showDetails: boolean;
}

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    level?: 'app' | 'feature' | 'component';
    context?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', {
            error,
            errorInfo,
            context: this.props.context,
            level: this.props.level,
        });

        this.setState({
            errorInfo,
        });

        // Call optional error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log to external service in production
        if (process.env.NODE_ENV === 'production') {
            // TODO: Add integration with error tracking service (e.g., Sentry)
            console.error('Production error logged:', {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                context: this.props.context,
            });
        }
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    toggleDetails = () => {
        this.setState(prev => ({
            showDetails: !prev.showDetails,
        }));
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { error, errorInfo, showDetails } = this.state;
            const { level = 'component', context } = this.props;

            const getSeverityAndTitle = () => {
                switch (level) {
                    case 'app':
                        return { severity: 'error' as const, title: 'Application Error' };
                    case 'feature':
                        return { severity: 'error' as const, title: 'Feature Error' };
                    default:
                        return { severity: 'warning' as const, title: 'Component Error' };
                }
            };

            const { severity, title } = getSeverityAndTitle();

            return (
                <Box
                    sx={{
                        p: 3,
                        minHeight: level === 'app' ? '100vh' : 'auto',
                        display: 'flex',
                        alignItems: level === 'app' ? 'center' : 'flex-start',
                        justifyContent: 'center',
                    }}
                >
                    <Box sx={{ maxWidth: 600, width: '100%' }}>
                        <Alert 
                            severity={severity}
                            icon={<ErrorOutline />}
                            sx={{ mb: 2 }}
                        >
                            <AlertTitle>{title}</AlertTitle>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                {context && `Context: ${context} - `}
                                Something went wrong while rendering this {level === 'app' ? 'application' : level}.
                                {level !== 'app' && ' The rest of the application should continue to work normally.'}
                            </Typography>
                            
                            {process.env.NODE_ENV === 'development' && error && (
                                <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace', color: 'error.dark' }}>
                                    {error.message}
                                </Typography>
                            )}

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button 
                                    variant="outlined" 
                                    size="small" 
                                    onClick={this.handleRetry}
                                    startIcon={<Refresh />}
                                >
                                    Try Again
                                </Button>
                                
                                {level === 'app' && (
                                    <Button 
                                        variant="contained" 
                                        size="small" 
                                        onClick={this.handleReload}
                                        startIcon={<Refresh />}
                                    >
                                        Reload Page
                                    </Button>
                                )}
                                
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={this.toggleDetails}
                                    startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                                >
                                    {showDetails ? 'Hide' : 'Show'} Details
                                </Button>
                            </Box>
                        </Alert>

                        <Collapse in={showDetails}>
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <AlertTitle>Error Details</AlertTitle>
                                
                                {error && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Error Message:
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontFamily: 'monospace', 
                                                backgroundColor: 'grey.100',
                                                p: 1,
                                                borderRadius: 1,
                                                whiteSpace: 'pre-wrap',
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            {error.message}
                                        </Typography>
                                    </Box>
                                )}

                                {error?.stack && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Stack Trace:
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontFamily: 'monospace', 
                                                backgroundColor: 'grey.100',
                                                p: 1,
                                                borderRadius: 1,
                                                whiteSpace: 'pre-wrap',
                                                fontSize: '0.75rem',
                                                maxHeight: 200,
                                                overflow: 'auto',
                                            }}
                                        >
                                            {error.stack}
                                        </Typography>
                                    </Box>
                                )}

                                {errorInfo?.componentStack && (
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Component Stack:
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontFamily: 'monospace', 
                                                backgroundColor: 'grey.100',
                                                p: 1,
                                                borderRadius: 1,
                                                whiteSpace: 'pre-wrap',
                                                fontSize: '0.75rem',
                                                maxHeight: 200,
                                                overflow: 'auto',
                                            }}
                                        >
                                            {errorInfo.componentStack}
                                        </Typography>
                                    </Box>
                                )}
                            </Alert>
                        </Collapse>
                    </Box>
                </Box>
            );
        }

        return this.props.children;
    }
}

// Convenience components for different levels
export const AppErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
    <ErrorBoundary {...props} level="app" />
);

export const FeatureErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
    <ErrorBoundary {...props} level="feature" />
);

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
    <ErrorBoundary {...props} level="component" />
);