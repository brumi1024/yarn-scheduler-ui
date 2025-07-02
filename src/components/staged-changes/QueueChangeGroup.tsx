import React, { useState } from 'react';
import {
    Box,
    Typography,
    Collapse,
    IconButton,
    Chip,
    useTheme,
    Divider,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Folder as FolderIcon,
    AccountTree as QueueIcon,
} from '@mui/icons-material';
import type { StagedChange } from '../../types';
import { DiffView } from './DiffView';

interface QueueChangeGroupProps {
    queuePath: string;
    changes: StagedChange[];
    onRevertChange: (changeId: string) => void;
    defaultExpanded?: boolean;
}


export const QueueChangeGroup: React.FC<QueueChangeGroupProps> = ({
    queuePath,
    changes,
    onRevertChange,
    defaultExpanded = true,
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(defaultExpanded);
    // Calculate change summary inline
    const summary = changes.reduce(
        (acc, change) => {
            acc[change.type]++;
            return acc;
        },
        { add: 0, update: 0, remove: 0 }
    );
    
    const handleToggle = () => {
        setExpanded(!expanded);
    };
    
    return (
        <Box 
            sx={{ 
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: theme.palette.background.paper,
            }}
        >
            {/* Group Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    backgroundColor: theme.palette.grey[50],
                    borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none',
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: theme.palette.grey[100],
                    },
                    transition: 'background-color 0.2s ease-in-out',
                }}
                onClick={handleToggle}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                    {queuePath === 'global' ? <FolderIcon fontSize="small" /> : <QueueIcon fontSize="small" />}
                    <Typography 
                        variant="subtitle1" 
                        sx={{ 
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            flexGrow: 1,
                        }}
                    >
                        {queuePath === 'global' ? 'Global Settings' : queuePath}
                    </Typography>
                    
                    {/* Change summary chips */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {summary.add > 0 && (
                            <Chip
                                label={`+${summary.add}`}
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ 
                                    fontSize: '0.7rem',
                                    height: 20,
                                    fontWeight: 600,
                                }}
                            />
                        )}
                        {summary.update > 0 && (
                            <Chip
                                label={`~${summary.update}`}
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ 
                                    fontSize: '0.7rem',
                                    height: 20,
                                    fontWeight: 600,
                                }}
                            />
                        )}
                        {summary.remove > 0 && (
                            <Chip
                                label={`-${summary.remove}`}
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ 
                                    fontSize: '0.7rem',
                                    height: 20,
                                    fontWeight: 600,
                                }}
                            />
                        )}
                    </Box>
                    
                    <Typography 
                        variant="caption" 
                        sx={{ 
                            color: theme.palette.text.secondary,
                            minWidth: 'fit-content',
                            ml: 1,
                        }}
                    >
                        {changes.length} change{changes.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                
                <IconButton 
                    size="small" 
                    sx={{ 
                        ml: 1,
                        transform: expanded ? 'rotate(0deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease-in-out',
                    }}
                >
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>
            
            {/* Changes List */}
            <Collapse in={expanded}>
                <Box sx={{ p: 2, pt: 1.5 }}>
                    {changes.map((change, index) => (
                        <React.Fragment key={change.id}>
                            <DiffView
                                change={change}
                                onRevert={onRevertChange}
                                timestamp={new Date(change.timestamp).toLocaleTimeString()}
                            />
                            {index < changes.length - 1 && (
                                <Divider sx={{ my: 1, opacity: 0.3 }} />
                            )}
                        </React.Fragment>
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
};