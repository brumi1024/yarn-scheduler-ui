import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
    IconButton,
    Alert,
    CircularProgress,
    Collapse,
    Grid,
} from '@mui/material';
import { Download, Clear, BugReport, CheckCircle, Warning, Error } from '@mui/icons-material';
import { useActivityStore } from '../store/activityStore';
import { useDataStore } from '../store/dataStore';
import { useChangesStore } from '../store/changesStore';
import { validateConfiguration, type ValidationResult } from '../utils/validation';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export default function Diagnostics() {
    const { logs, clearActivityLogs } = useActivityStore();
    const { scheduler, configuration, nodeLabels, nodes } = useDataStore();
    const { stagedChanges } = useChangesStore();

    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [exportTabValue, setExportTabValue] = useState(0);
    const [validationExpanded, setValidationExpanded] = useState(false);

    const filteredLogs = logs.filter((log) => {
        if (typeFilter !== 'all' && log.type !== typeFilter) return false;
        if (levelFilter !== 'all' && log.level !== levelFilter) return false;
        return true;
    });

    // Validate configuration
    const validationResult: ValidationResult | null = useMemo(() => {
        if (!configuration) return null;
        try {
            return validateConfiguration(configuration);
        } catch (error) {
            return {
                errors: [
                    {
                        path: 'configuration',
                        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
                        severity: 'error' as const,
                    },
                ],
                warnings: [],
                isValid: false,
            };
        }
    }, [configuration]);

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error':
                return 'error';
            case 'warn':
                return 'warning';
            case 'info':
                return 'info';
            case 'debug':
                return 'default' as const;
            default:
                return 'default' as const;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'user_action':
                return 'primary';
            case 'system_event':
                return 'secondary';
            case 'api_call':
                return 'info';
            case 'validation':
                return 'warning';
            case 'error':
                return 'error';
            default:
                return 'default' as const;
        }
    };

    const exportToJson = (data: unknown, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportConfiguration = () => {
        const configData = {
            configuration,
            nodeLabels,
            exportedAt: new Date().toISOString(),
            type: 'configuration',
            description: 'YARN Capacity Scheduler configuration (scheduler-conf endpoint)',
        };
        exportToJson(configData, `yarn-configuration-${Date.now()}.json`);
    };

    const handleExportSchedulerData = () => {
        const schedulerData = {
            scheduler,
            nodes,
            exportedAt: new Date().toISOString(),
            type: 'scheduler',
            description: 'YARN Scheduler live data (scheduler endpoint)',
        };
        exportToJson(schedulerData, `yarn-scheduler-data-${Date.now()}.json`);
    };

    const handleExportStaged = () => {
        const stagedData = {
            stagedChanges,
            exportedAt: new Date().toISOString(),
            type: 'staged-changes',
            description: 'Staged configuration changes pending application',
        };
        exportToJson(stagedData, `yarn-staged-changes-${Date.now()}.json`);
    };

    const handleExportValidation = () => {
        if (!validationResult) return;
        const validationData = {
            validation: validationResult,
            exportedAt: new Date().toISOString(),
            type: 'validation',
            description: 'Configuration validation results',
        };
        exportToJson(validationData, `yarn-validation-${Date.now()}.json`);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Diagnostics
            </Typography>

            {/* Configuration Validation */}
            <Paper sx={{ mt: 2 }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="h6">Configuration Validation</Typography>
                            {validationResult && (
                                <Chip
                                    icon={validationResult.isValid ? <CheckCircle /> : <Error />}
                                    label={validationResult.isValid ? 'Valid' : 'Issues Found'}
                                    color={validationResult.isValid ? 'success' : 'error'}
                                    size="small"
                                />
                            )}
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                startIcon={<BugReport />}
                                onClick={() => setValidationExpanded(!validationExpanded)}
                                disabled={!validationResult}
                            >
                                {validationExpanded ? 'Hide Details' : 'Show Details'}
                            </Button>
                            <IconButton
                                onClick={handleExportValidation}
                                disabled={!validationResult}
                                title="Export validation results"
                            >
                                <Download />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Box>

                <Collapse in={validationExpanded}>
                    <Box sx={{ p: 2 }}>
                        {validationResult ? (
                            <Grid container spacing={2}>
                                {validationResult.errors.length > 0 && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="error" gutterBottom>
                                            Errors ({validationResult.errors.length})
                                        </Typography>
                                        {validationResult.errors.map((error, index) => (
                                            <Alert key={index} severity="error" sx={{ mb: 1 }}>
                                                <Typography variant="body2">
                                                    <strong>{error.path}:</strong> {error.message}
                                                </Typography>
                                            </Alert>
                                        ))}
                                    </Grid>
                                )}

                                {validationResult.warnings.length > 0 && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                            Warnings ({validationResult.warnings.length})
                                        </Typography>
                                        {validationResult.warnings.map((warning, index) => (
                                            <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                                                <Typography variant="body2">
                                                    <strong>{warning.path}:</strong> {warning.message}
                                                </Typography>
                                            </Alert>
                                        ))}
                                    </Grid>
                                )}

                                {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                                    <Grid item xs={12}>
                                        <Alert severity="success">
                                            <Typography variant="body2">
                                                Configuration validation passed with no issues found.
                                            </Typography>
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        ) : (
                            <Typography color="text.secondary">No configuration available for validation.</Typography>
                        )}
                    </Box>
                </Collapse>
            </Paper>

            {/* Activity Log Viewer */}
            <Paper sx={{ mt: 2 }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">Activity Log</Typography>
                        <Stack direction="row" spacing={2}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Type</InputLabel>
                                <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                                    <MenuItem value="all">All Types</MenuItem>
                                    <MenuItem value="user_action">User Action</MenuItem>
                                    <MenuItem value="system_event">System Event</MenuItem>
                                    <MenuItem value="api_call">API Call</MenuItem>
                                    <MenuItem value="validation">Validation</MenuItem>
                                    <MenuItem value="error">Error</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Level</InputLabel>
                                <Select
                                    value={levelFilter}
                                    label="Level"
                                    onChange={(e) => setLevelFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Levels</MenuItem>
                                    <MenuItem value="debug">Debug</MenuItem>
                                    <MenuItem value="info">Info</MenuItem>
                                    <MenuItem value="warn">Warning</MenuItem>
                                    <MenuItem value="error">Error</MenuItem>
                                </Select>
                            </FormControl>
                            <IconButton onClick={clearActivityLogs} color="error" title="Clear logs">
                                <Clear />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell>Level</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Message</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {formatTimestamp(log.timestamp)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={log.level} size="small" color={getLevelColor(log.level)} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.type}
                                            size="small"
                                            color={getTypeColor(log.type)}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{log.message}</TableCell>
                                </TableRow>
                            ))}
                            {filteredLogs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            No log entries match the current filters
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Export Tools */}
            <Paper sx={{ p: 3, mt: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Export Tools</Typography>
                    <Button variant="contained" startIcon={<Download />} onClick={() => setExportDialogOpen(true)}>
                        Export Configuration
                    </Button>
                </Stack>
            </Paper>

            {/* Export Dialog */}
            <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Export Configuration</DialogTitle>
                <DialogContent>
                    <Tabs value={exportTabValue} onChange={(_, newValue) => setExportTabValue(newValue)}>
                        <Tab label="Configuration" />
                        <Tab label="Scheduler Data" />
                        <Tab label="Staged Changes" />
                    </Tabs>
                    <TabPanel value={exportTabValue} index={0}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Export YARN configuration data (scheduler-conf endpoint) including queue settings and node
                            labels.
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={handleExportConfiguration}
                            startIcon={<Download />}
                            disabled={!configuration}
                        >
                            Download Configuration Data
                        </Button>
                    </TabPanel>
                    <TabPanel value={exportTabValue} index={1}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Export live scheduler data (scheduler endpoint) including queue metrics, applications, and
                            node information.
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={handleExportSchedulerData}
                            startIcon={<Download />}
                            disabled={!scheduler}
                        >
                            Download Scheduler Data
                        </Button>
                    </TabPanel>
                    <TabPanel value={exportTabValue} index={2}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Export all staged changes that haven't been applied yet.
                            {stagedChanges.length === 0 && ' (No staged changes available)'}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={handleExportStaged}
                            startIcon={<Download />}
                            disabled={stagedChanges.length === 0}
                        >
                            Download Staged Changes ({stagedChanges.length})
                        </Button>
                    </TabPanel>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExportDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
