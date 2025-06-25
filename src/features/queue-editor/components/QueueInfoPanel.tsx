import React, { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Box, Paper, Typography, IconButton, Tooltip, Card, CardContent, Button } from '@mui/material';
import {
    Close as CloseIcon,
    Dashboard as OverviewIcon,
    TrendingUp as StatisticsIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import type { ParsedQueue } from '../../../types/Queue';
import { useConfigStore } from '../../../store/configStore';
import { useUIStore } from '../../../store/uiStore';
import { QueueInfoOverview } from './queue-info/QueueInfoOverview';
import { QueueInfoSettings } from './queue-info/QueueInfoSettings';
import { buildConfigPath } from '../../../utils/configFormUtils';
import { QUEUE_PROPERTIES } from '../../../config';

export interface QueueInfoPanelProps {
    queue: ParsedQueue | null;
    open: boolean;
    onClose: () => void;
    onDelete?: (queuePath: string) => void;
    onToggleState?: (queuePath: string, newState: 'RUNNING' | 'STOPPED') => void;
    onQueueSelect?: (queue: ParsedQueue) => void;
}

export const QueueInfoPanel: React.FC<QueueInfoPanelProps> = ({
    queue,
    open,
    onClose,
    onDelete,
    onToggleState,
    onQueueSelect,
}) => {
    const [activeTab, setActiveTab] = useState(0);

    // Get state from stores
    const selectedNodeLabel = useUIStore((state) => state.selectedNodeLabel);
    const propertyEditorModal = useUIStore((state) => state.modals?.propertyEditor);

    // Switch to Settings tab when expandedSection is provided
    useEffect(() => {
        if (propertyEditorModal?.expandedSection) {
            setActiveTab(2); // Settings tab is index 2
        }
    }, [propertyEditorModal?.expandedSection]);

    // Create form without validation schema - validation is handled by configStore
    const form = useForm({
        defaultValues: {},
        mode: 'onChange',
    });

    const { reset } = form;

    // Initialize form when queue changes or computed config updates
    useEffect(() => {
        if (queue && open) {
            // Get current values from computed config
            const formData: Record<string, any> = {};

            Object.entries(QUEUE_PROPERTIES).forEach(([key, definition]) => {
                const path = buildConfigPath(queue.path, key);
                const value = useConfigStore.getState().getFieldValue(path);

                // Only use the actual value from config, no defaults
                formData[key] = value;
            });

            reset(formData);

            if (propertyEditorModal?.expandedSection) {
                setActiveTab(2); // Settings tab
            } else {
                setActiveTab(0); // Overview tab
            }
        }
    }, [queue, open, reset, propertyEditorModal?.expandedSection]);

    // Handle form submission - not needed in new architecture
    // Changes are staged immediately via useConfigField
    const handleSave = useCallback(() => {
        // In the new architecture, changes are already staged
        // This is just a placeholder for UI consistency
        console.log('Changes are automatically staged');
    }, []);

    const handleReset = useCallback(() => {
        // Clear all staged changes for this queue
        const { staged, unstageChange } = useConfigStore.getState();

        staged.forEach((_, path) => {
            if (queue && path.startsWith(`queues.${queue.path}.`)) {
                unstageChange(path);
            }
        });

        // Reset form to current computed values
        reset();
    }, [queue?.path, reset]);

    if (!queue || !open) {
        return null;
    }

    return (
        <FormProvider {...form}>
            <Paper
                elevation={0}
                sx={{
                    position: 'fixed',
                    top: '112px',
                    right: open ? 0 : '-400px',
                    width: 400,
                    height: 'calc(100vh - 112px)',
                    transition: 'right 0.3s ease-in-out',
                    zIndex: 1300,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    bgcolor: 'grey.50',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)',
                    pointerEvents: open ? 'auto' : 'none',
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        borderBottom: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>
                        {queue.name}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Tab Navigation */}
                <Box sx={{ p: 1.5, pt: 1 }}>
                    <Card
                        variant="outlined"
                        sx={{
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        }}
                    >
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 0.5,
                                    bgcolor: 'grey.100',
                                    borderRadius: 1.5,
                                    p: 0.5,
                                }}
                            >
                                <Tooltip title="Overview">
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => setActiveTab(0)}
                                        startIcon={<OverviewIcon fontSize="small" />}
                                        sx={{
                                            flex: 1,
                                            minWidth: 0,
                                            fontSize: '0.75rem',
                                            py: 0.75,
                                            border: 'none',
                                            bgcolor: activeTab === 0 ? 'background.paper' : 'transparent',
                                            color: activeTab === 0 ? 'primary.main' : 'text.secondary',
                                            boxShadow: activeTab === 0 ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                                            '&:hover': {
                                                bgcolor: activeTab === 0 ? 'background.paper' : 'action.hover',
                                                border: 'none',
                                            },
                                        }}
                                    >
                                        Overview
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Statistics">
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => setActiveTab(1)}
                                        startIcon={<StatisticsIcon fontSize="small" />}
                                        sx={{
                                            flex: 1,
                                            minWidth: 0,
                                            fontSize: '0.75rem',
                                            py: 0.75,
                                            border: 'none',
                                            bgcolor: activeTab === 1 ? 'background.paper' : 'transparent',
                                            color: activeTab === 1 ? 'primary.main' : 'text.secondary',
                                            boxShadow: activeTab === 1 ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                                            '&:hover': {
                                                bgcolor: activeTab === 1 ? 'background.paper' : 'action.hover',
                                                border: 'none',
                                            },
                                        }}
                                    >
                                        Stats
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Settings">
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => setActiveTab(2)}
                                        startIcon={<SettingsIcon fontSize="small" />}
                                        sx={{
                                            flex: 1,
                                            minWidth: 0,
                                            fontSize: '0.75rem',
                                            py: 0.75,
                                            border: 'none',
                                            bgcolor: activeTab === 2 ? 'background.paper' : 'transparent',
                                            color: activeTab === 2 ? 'primary.main' : 'text.secondary',
                                            boxShadow: activeTab === 2 ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                                            '&:hover': {
                                                bgcolor: activeTab === 2 ? 'background.paper' : 'action.hover',
                                                border: 'none',
                                            },
                                        }}
                                    >
                                        Settings
                                    </Button>
                                </Tooltip>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {activeTab === 0 && (
                        <QueueInfoOverview
                            queue={queue}
                            onQueueSelect={onQueueSelect!}
                            onDelete={() => onDelete?.(queue.name)}
                            onToggleState={() =>
                                onToggleState?.(queue.name, queue.state === 'RUNNING' ? 'STOPPED' : 'RUNNING')
                            }
                        />
                    )}
                    {activeTab === 1 && (
                        <Box sx={{ p: 1.5 }}>
                            <Typography>Statistics will be shown here.</Typography>
                        </Box>
                    )}
                    {activeTab === 2 && (
                        <QueueInfoSettings
                            queue={queue}
                            selectedNodeLabel={selectedNodeLabel}
                            onReset={handleReset}
                            expandedSection={propertyEditorModal?.expandedSection}
                        />
                    )}
                </Box>
            </Paper>
        </FormProvider>
    );
};
