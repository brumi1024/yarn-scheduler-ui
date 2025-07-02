import React, { useState } from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
} from '@mui/icons-material';
import { useQueueActions } from '../hooks/useQueueActions';
import { AddQueueDialog } from '../dialogs/AddQueueDialog';
import { DeleteQueueDialog } from '../dialogs/DeleteQueueDialog';

interface QueueContextMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    queuePath: string;
    queueState?: string;
    onEditProperties?: () => void;
}

export function QueueContextMenu({
    anchorEl,
    open,
    onClose,
    queuePath,
    queueState = 'RUNNING',
    onEditProperties,
}: QueueContextMenuProps) {
    const { canAddChildQueue, canDeleteQueue, updateQueueProperty } = useQueueActions();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const canAdd = canAddChildQueue(queuePath);
    const canDelete = canDeleteQueue(queuePath);
    const isRunning = queueState === 'RUNNING';

    const handleAddQueue = () => {
        setAddDialogOpen(true);
        onClose();
    };

    const handleDeleteQueue = () => {
        setDeleteDialogOpen(true);
        onClose();
    };

    const handleToggleState = () => {
        const newState = isRunning ? 'STOPPED' : 'RUNNING';
        updateQueueProperty(queuePath, 'state', newState);
        onClose();
    };

    const handleEditProperties = () => {
        onEditProperties?.();
        onClose();
    };

    return (
        <>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={onClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                {canAdd && (
                    <MenuItem onClick={handleAddQueue}>
                        <ListItemIcon>
                            <AddIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Add Child Queue</ListItemText>
                    </MenuItem>
                )}

                <MenuItem onClick={handleEditProperties}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Properties</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleToggleState}>
                    <ListItemIcon>
                        {isRunning ? <StopIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{isRunning ? 'Stop Queue' : 'Start Queue'}</ListItemText>
                </MenuItem>

                {canDelete && <Divider />}
                {canDelete && (
                    <MenuItem onClick={handleDeleteQueue}>
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>Delete Queue</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            <AddQueueDialog
                open={addDialogOpen}
                parentQueuePath={queuePath}
                onClose={() => setAddDialogOpen(false)}
            />

            <DeleteQueueDialog
                open={deleteDialogOpen}
                queuePath={queuePath}
                onClose={() => setDeleteDialogOpen(false)}
            />
        </>
    );
}