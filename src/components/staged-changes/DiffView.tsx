import React from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    useTheme,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Remove as RemoveIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import type { StagedChange } from '../../types';

// Common style constants
const CHIP_HEIGHT = 24;
const DIFF_BORDER_RADIUS = 2;
const MONOSPACE_FONT = 'Monaco, Consolas, "Courier New", monospace';

interface DiffViewProps {
    change: StagedChange;
    onRevert: (changeId: string) => void;
    timestamp: string;
}

const getChangeTypeIcon = (type: StagedChange['type']) => {
    switch (type) {
        case 'add':
            return <AddIcon fontSize="small" />;
        case 'update':
            return <EditIcon fontSize="small" />;
        case 'remove':
            return <RemoveIcon fontSize="small" />;
        default:
            return <EditIcon fontSize="small" />;
    }
};

const getChangeTypeColor = (type: StagedChange['type']) => {
    switch (type) {
        case 'add':
            return 'success';
        case 'update':
            return 'info';
        case 'remove':
            return 'error';
        default:
            return 'info';
    }
};

const formatPropertyName = (property: string | undefined): string => {
    if (!property) return 'Queue operation';
    
    // Handle node label properties with better formatting
    if (property.includes('accessible-node-labels.') && property.split('.').length === 3) {
        const parts = property.split('.');
        const label = parts[1];
        const labelProperty = parts[2];
        return `${labelProperty} (label: ${label})`;
    }
    
    return property;
};

const DiffValue: React.FC<{ 
    value: string | undefined; 
    type: 'old' | 'new'; 
    changeType: StagedChange['type'] 
}> = ({ value, type, changeType }) => {
    const theme = useTheme();
    
    if (!value && value !== '') return null;
    
    const isOld = type === 'old';
    const isNew = type === 'new';
    
    // Color coding for diff values
    const getBackgroundColor = () => {
        if (changeType === 'add' && isNew) return theme.palette.success.main + '15';
        if (changeType === 'remove' && isOld) return theme.palette.error.main + '15';
        if (changeType === 'update') {
            return isOld 
                ? theme.palette.error.main + '10' 
                : theme.palette.success.main + '15';
        }
        return 'transparent';
    };
    
    const getTextColor = () => {
        if (changeType === 'remove' && isOld) return theme.palette.text.secondary;
        return theme.palette.text.primary;
    };
    
    const prefix = changeType === 'add' ? '+ ' : changeType === 'remove' ? '- ' : isOld ? '- ' : '+ ';
    
    return (
        <Box
            sx={{
                backgroundColor: getBackgroundColor(),
                borderRadius: 1,
                px: 1.5,
                py: 0.5,
                border: `1px solid ${theme.palette.divider}`,
                fontFamily: MONOSPACE_FONT,
                fontSize: '0.75rem',
                color: getTextColor(),
                textDecoration: (changeType === 'remove' || (changeType === 'update' && isOld)) ? 'line-through' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
            }}
        >
            <Typography 
                component="span" 
                sx={{ 
                    color: isOld ? theme.palette.error.main : theme.palette.success.main,
                    fontWeight: 600,
                    minWidth: '12px'
                }}
            >
                {prefix}
            </Typography>
            <Typography component="span" sx={{ wordBreak: 'break-all' }}>
                {value || '(empty)'}
            </Typography>
        </Box>
    );
};

export const DiffView: React.FC<DiffViewProps> = ({ change, onRevert, timestamp }) => {
    const theme = useTheme();
    const changeTypeColor = getChangeTypeColor(change.type);
    
    return (
        <Box
            sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: DIFF_BORDER_RADIUS,
                overflow: 'hidden',
                mb: 1.5,
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                    boxShadow: 1,
                },
                transition: 'box-shadow 0.2s ease-in-out',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.grey[50],
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                    <Chip
                        icon={getChangeTypeIcon(change.type)}
                        label={change.type.toUpperCase()}
                        color={changeTypeColor as any}
                        size="small"
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: CHIP_HEIGHT,
                        }}
                    />
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            flexGrow: 1,
                        }}
                    >
                        {formatPropertyName(change.property)}
                    </Typography>
                    <Typography 
                        variant="caption" 
                        sx={{ 
                            color: theme.palette.text.secondary,
                            fontSize: '0.7rem',
                        }}
                    >
                        {timestamp}
                    </Typography>
                </Box>
                <Tooltip title="Revert this change">
                    <IconButton
                        size="small"
                        onClick={() => onRevert(change.id)}
                        sx={{
                            ml: 1,
                            '&:hover': {
                                backgroundColor: theme.palette.error.main + '10',
                                color: theme.palette.error.main,
                            },
                        }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
            
            {/* Diff Content */}
            <Box sx={{ p: 1.5 }}>
                {change.type === 'update' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                        <DiffValue 
                            value={change.oldValue} 
                            type="old" 
                            changeType={change.type} 
                        />
                        <DiffValue 
                            value={change.newValue} 
                            type="new" 
                            changeType={change.type} 
                        />
                    </Box>
                )}
                
                {change.type === 'add' && change.newValue && (
                    <DiffValue 
                        value={change.newValue} 
                        type="new" 
                        changeType={change.type} 
                    />
                )}
                
                {change.type === 'remove' && change.oldValue && (
                    <DiffValue 
                        value={change.oldValue} 
                        type="old" 
                        changeType={change.type} 
                    />
                )}
                
                {change.type === 'remove' && !change.oldValue && (
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            color: theme.palette.error.main,
                            fontStyle: 'italic',
                        }}
                    >
                        Queue will be removed
                    </Typography>
                )}
            </Box>
        </Box>
    );
};