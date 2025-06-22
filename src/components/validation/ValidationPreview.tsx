// src/components/validation/ValidationPreview.tsx
import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Alert,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ValidationEngine, type ValidationResult, type ValidationIssue } from '../../validation';
import { useDataStore } from '../../store/dataStore';
import { useChangesStore } from '../../store/changesStore';

interface ValidationPreviewProps {
    open: boolean;
    onClose: () => void;
    onProceed?: () => void;
}

export const ValidationPreview: React.FC<ValidationPreviewProps> = ({ open, onClose, onProceed }) => {
    const { configuration } = useDataStore();
    const { stagedChanges } = useChangesStore();
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const runValidation = useCallback(async () => {
        if (!configuration) return;

        setIsValidating(true);
        try {
            // Convert to flat configuration
            const flatConfig: Record<string, string> = {};
            configuration.property.forEach((prop) => {
                flatConfig[prop.name] = prop.value;
            });

            // Apply staged changes
            stagedChanges.forEach((change) => {
                flatConfig[change.key] = change.value;
            });

            // Run validation
            const engine = new ValidationEngine();
            const result = engine.validate(flatConfig);
            setValidationResult(result);
        } catch (error) {
            console.error('Validation failed:', error);
        } finally {
            setIsValidating(false);
        }
    }, [configuration, stagedChanges]);

    // Run validation when dialog opens
    React.useEffect(() => {
        if (open) {
            runValidation();
        }
    }, [open, runValidation]);

    const groupIssuesByQueue = (issues: ValidationIssue[]) => {
        const grouped: Record<string, ValidationIssue[]> = {};

        issues.forEach((issue) => {
            // Extract queue path from issue path
            const match = issue.path.match(/^(root(?:\.[^.]+)*)/);
            const queuePath = match ? match[1] : 'global';

            if (!grouped[queuePath]) {
                grouped[queuePath] = [];
            }
            grouped[queuePath].push(issue);
        });

        return grouped;
    };

    const renderIssueGroup = (queuePath: string, issues: ValidationIssue[]) => {
        const errors = issues.filter((i) => i.severity === 'error');
        const warnings = issues.filter((i) => i.severity === 'warning');

        return (
            <Accordion key={queuePath} defaultExpanded={errors.length > 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="subtitle2">{queuePath}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, ml: 'auto', mr: 2 }}>
                            {errors.length > 0 && (
                                <Chip
                                    icon={<ErrorIcon />}
                                    label={`${errors.length} error${errors.length > 1 ? 's' : ''}`}
                                    color="error"
                                    size="small"
                                />
                            )}
                            {warnings.length > 0 && (
                                <Chip
                                    icon={<WarningIcon />}
                                    label={`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}
                                    color="warning"
                                    size="small"
                                />
                            )}
                        </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <List dense>
                        {issues.map((issue, index) => (
                            <ListItem key={index}>
                                <ListItemIcon>
                                    {issue.severity === 'error' ? (
                                        <ErrorIcon color="error" />
                                    ) : (
                                        <WarningIcon color="warning" />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={issue.message}
                                    secondary={`Rule: ${issue.rule} | Path: ${issue.path}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </AccordionDetails>
            </Accordion>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Configuration Validation Preview</DialogTitle>
            <DialogContent>
                {isValidating ? (
                    <Box sx={{ py: 4 }}>
                        <LinearProgress />
                        <Typography align="center" sx={{ mt: 2 }}>
                            Validating configuration...
                        </Typography>
                    </Box>
                ) : validationResult ? (
                    <Box>
                        {validationResult.isValid ? (
                            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
                                Configuration is valid! No errors found.
                            </Alert>
                        ) : (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                Configuration has {validationResult.errors.length} error(s) that must be fixed.
                            </Alert>
                        )}

                        {validationResult.warnings.length > 0 && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Found {validationResult.warnings.length} warning(s) that should be reviewed.
                            </Alert>
                        )}

                        {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                            <Box>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Issues by Queue
                                </Typography>

                                {/* Errors */}
                                {validationResult.errors.length > 0 && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>
                                            Errors ({validationResult.errors.length})
                                        </Typography>
                                        {Object.entries(groupIssuesByQueue(validationResult.errors)).map(
                                            ([queuePath, issues]) => renderIssueGroup(queuePath, issues)
                                        )}
                                    </Box>
                                )}

                                {/* Warnings */}
                                {validationResult.warnings.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle1" color="warning.main" sx={{ mb: 1 }}>
                                            Warnings ({validationResult.warnings.length})
                                        </Typography>
                                        {Object.entries(groupIssuesByQueue(validationResult.warnings)).map(
                                            ([queuePath, issues]) => renderIssueGroup(queuePath, issues)
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Typography>No validation results available.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                {onProceed && validationResult?.isValid && (
                    <Button onClick={onProceed} variant="contained" color="primary">
                        Proceed with Changes
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
