import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { QueueVisualization } from './components/QueueVisualization';
import { ComponentErrorBoundary } from '../../components/ErrorBoundary';
import { StagedChangesPanel } from './components/StagedChangesPanel';
import { useUIStore } from '../../store';

export default function QueueEditor() {
    const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
    
    // Use store selector to avoid reference issues
    const setSearchQuery = useUIStore((state) => state.setSearchQuery);
    
    // Debounce the search query to avoid excessive filtering
    const [debouncedSearchQuery] = useDebounce(localSearchQuery, 300);

    // Sync debounced search query with store (one-way flow only)
    useEffect(() => {
        setSearchQuery(debouncedSearchQuery);
    }, [debouncedSearchQuery, setSearchQuery]);

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
                    justifyContent: 'space-between',
                    gap: 3,
                }}
            >
                <Box>
                    <Typography variant="h5" component="h1">
                        Queue Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Interactive queue tree with search, modification, and staging
                    </Typography>
                </Box>
                
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
        </Box>
    );
}
