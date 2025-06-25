import { Box, Typography, TextField, InputAdornment, Button } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { QueueVisualizationContainer } from './components/QueueVisualizationContainer';
import { ComponentErrorBoundary } from '../../components/ErrorBoundary';
import { StagedChangesPanel } from './components/StagedChangesPanel';
import MultiQueueComparisonView from './components/MultiQueueComparisonView';
import { NodeLabelSelector } from './components/NodeLabelSelector';
import { useUIStore } from '../../store';
import { useConfigStore } from '../../store/configStore';

export default function QueueEditor() {
    const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
    const [showComparisonDialog, setShowComparisonDialog] = useState<boolean>(false);

    // Use store selectors to avoid reference issues
    const setSearchQuery = useUIStore((state) => state.setSearchQuery);
    const comparisonQueueNames = useUIStore((state) => state.comparisonQueueNames);

    // Get validation status for header display
    const validationStatus = useConfigStore((state) => state.validationStatus);
    const validationResults = useConfigStore((state) => state.validationResults);
    const errorCount = Array.from(validationResults.values())
        .flat()
        .filter((issue) => issue.severity === 'error').length;

    // Debounce the search query to avoid excessive filtering
    const [debouncedSearchQuery] = useDebounce(localSearchQuery, 300);

    // Sync debounced search query with store (one-way flow only)
    useEffect(() => {
        setSearchQuery(debouncedSearchQuery);
    }, [debouncedSearchQuery, setSearchQuery]);

    const showCompareButton = comparisonQueueNames.length >= 2;

    const handleCompare = () => {
        setShowComparisonDialog(true);
    };

    const handleCloseComparison = () => {
        setShowComparisonDialog(false);
    };

    const handleApplyChanges = () => {
        // Refresh config after applying changes
        useConfigStore.getState().refresh();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" component="h1">
                        Queue Management
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Interactive queue tree with search, modification, and staging
                        </Typography>
                        {validationStatus === 'invalid' && (
                            <Typography variant="body2" color="error" sx={{ fontWeight: 'medium' }}>
                                • {errorCount} validation {errorCount === 1 ? 'error' : 'errors'}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {showCompareButton && (
                    <Button
                        variant="contained"
                        onClick={handleCompare}
                        sx={{
                            textTransform: 'none',
                        }}
                    >
                        Compare {comparisonQueueNames.length} Queues
                    </Button>
                )}

                <NodeLabelSelector />

                <TextField
                    size="small"
                    placeholder="Search queues..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        minWidth: 300,
                        '& .MuiOutlinedInput-root': {
                            height: 40,
                        },
                    }}
                />
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <ComponentErrorBoundary>
                    <QueueVisualizationContainer />
                </ComponentErrorBoundary>

                {/* Multi-queue comparison dialog */}
                {showComparisonDialog && (
                    <MultiQueueComparisonView open={showComparisonDialog} onClose={handleCloseComparison} />
                )}
            </Box>

            {/* Staged Changes Panel */}
            <StagedChangesPanel onApplyChanges={handleApplyChanges} />
        </Box>
    );
}
