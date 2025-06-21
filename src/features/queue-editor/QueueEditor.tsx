import { Box, Typography, TextField, InputAdornment, Button } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { QueueVisualization } from './components/QueueVisualization';
import { ComponentErrorBoundary } from '../../components/ErrorBoundary';
import { StagedChangesPanel } from './components/StagedChangesPanel';
import MultiQueueComparisonView from './components/MultiQueueComparisonView';
import { NodeLabelSelector } from './components/NodeLabelSelector';
import { useUIStore } from '../../store';

export default function QueueEditor() {
    const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
    const [showComparisonDialog, setShowComparisonDialog] = useState<boolean>(false);
    
    // Use store selectors to avoid reference issues
    const setSearchQuery = useUIStore((state) => state.setSearchQuery);
    const comparisonQueueNames = useUIStore((state) => state.comparisonQueueNames);
    
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
                    <Typography variant="body2" color="text.secondary">
                        Interactive queue tree with search, modification, and staging
                    </Typography>
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

            {/* Visualization Area */}
            <Box
                sx={{
                    flexGrow: 1,
                    position: 'relative',
                    minHeight: 0, // Important for flex children
                }}
            >
                <ComponentErrorBoundary context="Queue Visualization">
                    <QueueVisualization />
                </ComponentErrorBoundary>

                {/* Staged Changes Panel */}
                <StagedChangesPanel
                    onApplyChanges={() => {
                        // TODO: Implement apply changes logic
                        console.log('Apply changes requested');
                    }}
                />
            </Box>

            {/* Comparison Dialog */}
            <MultiQueueComparisonView
                open={showComparisonDialog}
                onClose={handleCloseComparison}
            />
        </Box>
    );
}
