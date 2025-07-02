import React from 'react';
import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
            }

            return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </Typography>
                        <Button variant="outlined" size="small" onClick={this.handleRetry}>
                            Try Again
                        </Button>
                    </Alert>
                </Box>
            );
        }

        return this.props.children;
    }
}

interface FeatureErrorBoundaryProps {
    children: React.ReactNode;
    context: string;
}

export function FeatureErrorBoundary({ children, context }: FeatureErrorBoundaryProps): React.ReactElement {
    const fallback = ({ error, retry }: { error: Error; retry: () => void }) => (
        <Box sx={{ p: 3 }}>
            <Alert severity="error">
                <AlertTitle>Error in {context}</AlertTitle>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    {error.message || 'An unexpected error occurred in this feature'}
                </Typography>
                <Button variant="outlined" size="small" onClick={retry}>
                    Retry
                </Button>
            </Alert>
        </Box>
    );

    return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}