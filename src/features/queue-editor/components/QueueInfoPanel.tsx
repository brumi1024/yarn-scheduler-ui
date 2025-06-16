import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Paper, Typography, IconButton, Tooltip, Card, CardContent, Button } from '@mui/material';
import {
    Close as CloseIcon,
    Dashboard as OverviewIcon,
    TrendingUp as StatisticsIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import type { Queue } from '../../../types/Queue';
import { QUEUE_PROPERTIES } from '../../../config';
import { QueueInfoOverview } from './queue-info/QueueInfoOverview';
import { QueueInfoSettings } from './queue-info/QueueInfoSettings';
import { useChangesStore } from '../../../store';
import { createChangeSetsFromFormData } from '../../../utils/configurationUtils';

export interface QueueInfoPanelProps {
    queue: Queue | null;
    open: boolean;
    onClose: () => void;
    onDelete?: (queuePath: string) => void;
    onToggleState?: (queuePath: string, newState: 'RUNNING' | 'STOPPED') => void;
    onSaveProperties?: (queuePath: string, changes: Record<string, any>) => void;
    onQueueSelect?: (queue: Queue) => void;
}

export const QueueInfoPanel: React.FC<QueueInfoPanelProps> = ({
    queue,
    open,
    onClose,
    onDelete,
    onToggleState,
    onSaveProperties,
    onQueueSelect,
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [saveError, setSaveError] = useState<string | null>(null);

    const { stageChange } = useChangesStore();

    // Create validation schema from properties
    const validationSchema = z.object(
        Object.entries(QUEUE_PROPERTIES).reduce(
            (acc, [key, prop]) => ({
                ...acc,
                [key]: prop.validation.optional(), // Make all validations optional to allow empty/unchanged fields
            }),
            {}
        )
    );

    const form = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues: {},
        mode: 'onChange',
    });

    const { reset } = form;

    useEffect(() => {
        if (queue && open) {
            const initialData: Record<string, any> = {};
            Object.values(QUEUE_PROPERTIES).forEach((propDef) => {
                initialData[propDef.key] = propDef.getValueFromQueue(queue);
            });
            reset(initialData);
            setActiveTab(0);
            setSaveError(null);
        }
    }, [queue, open, reset]);

    if (!queue || !open) {
        return null;
    }

    const handleSave = (data: Record<string, any>) => {
        if (!queue?.queueName) return;
        try {
            setSaveError(null);
            const queuePath = (queue as any).queuePath || queue.queueName;
            const changes = createChangeSetsFromFormData(queuePath, data, queue);
            if (changes.length === 0) {
                return; // No actual changes made
            }
            changes.forEach((change) => stageChange(change));
            if (onSaveProperties) {
                onSaveProperties(queue.queueName, data);
            }
            reset(data);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
        }
    };

    const handleReset = () => {
        reset();
        setSaveError(null);
    };

    return (
        <FormProvider {...form}>
            <Paper
                elevation={0}
                sx={{
                    position: 'fixed',
                    top: '112px', // Position below AppBar (64px) + TabNavigation (48px)
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
                    pointerEvents: open ? 'auto' : 'none', // Allow clicks to pass through when closed
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
                        justifyContent: 'center',
                        position: 'relative',
                    }}
                >
                    <Typography variant="subtitle1" component="h2" color="text.primary" sx={{ fontWeight: 600 }}>
                        {queue?.queueName}
                    </Typography>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            position: 'absolute',
                            right: 12,
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Tab Selector Card */}
                <Box sx={{ p: 1.5 }}>
                    <Card sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                                            bgcolor: activeTab === 0 ? 'action.selected' : 'transparent',
                                            color: activeTab === 0 ? 'primary.main' : 'text.secondary',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
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
                                            bgcolor: activeTab === 1 ? 'action.selected' : 'transparent',
                                            color: activeTab === 1 ? 'primary.main' : 'text.secondary',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
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
                                            bgcolor: activeTab === 2 ? 'action.selected' : 'transparent',
                                            color: activeTab === 2 ? 'primary.main' : 'text.secondary',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
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
                            onDelete={() => onDelete?.(queue.queueName)}
                            onToggleState={() =>
                                onToggleState?.(queue.queueName, queue.state === 'RUNNING' ? 'STOPPED' : 'RUNNING')
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
                            saveError={saveError}
                            onSave={handleSave}
                            onReset={handleReset}
                        />
                    )}
                </Box>
            </Paper>
        </FormProvider>
    );
};
