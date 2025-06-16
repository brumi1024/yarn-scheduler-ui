import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Typography,
    LinearProgress,
    Card,
    CardContent,
    Alert,
    Chip,
} from '@mui/material';
import { parseCapacityValue, type ParsedCapacityValue, type CapacityMode } from '../utils/capacityUtils';


interface CapacityEditorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    siblings?: Array<{ name: string; capacity: string }>;
}

export function CapacityEditor({ label, value, onChange, error, siblings }: CapacityEditorProps) {
    const [capacityValue, setCapacityValue] = useState<ParsedCapacityValue>({
        mode: 'percentage',
        value: value || '10%',
    });

    useEffect(() => {
        const parsed = parseCapacityValue(value || '10%');
        setCapacityValue(parsed);
    }, [value]);


    const formatCapacityValue = (mode: CapacityMode, parsed: any): string => {
        switch (mode) {
            case 'percentage':
                return `${parsed.percentage || 10}%`;
            case 'weight':
                return `${parsed.weight || 1}w`;
            case 'absolute':
                return `[memory=${parsed.memory || 1024},vcores=${parsed.vcores || 1}]`;
            default:
                return '10%';
        }
    };

    const handleModeChange = (newMode: CapacityMode) => {
        let newParsed: any = {};

        switch (newMode) {
            case 'percentage':
                newParsed = { percentage: 10 };
                break;
            case 'weight':
                newParsed = { weight: 1 };
                break;
            case 'absolute':
                newParsed = { memory: 1024, vcores: 1 };
                break;
        }

        const newValue = formatCapacityValue(newMode, newParsed);
        const newCapacityValue = { mode: newMode, value: newValue, parsed: newParsed };

        setCapacityValue(newCapacityValue);
        onChange(newValue);
    };

    const handleValueChange = (field: string, newValue: number) => {
        const newParsed = { ...capacityValue.parsed, [field]: newValue };
        const formattedValue = formatCapacityValue(capacityValue.mode, newParsed);
        const newCapacityValue = { ...capacityValue, value: formattedValue, parsed: newParsed };

        setCapacityValue(newCapacityValue);
        onChange(formattedValue);
    };

    const calculateSiblingUsage = () => {
        if (!siblings || siblings.length === 0) return null;

        let totalUsed = 0;
        const siblingData = siblings.map((sibling) => {
            const parsed = parseCapacityValue(sibling.capacity);
            let usage = 0;

            if (parsed.mode === 'percentage' && parsed.parsed?.percentage) {
                usage = parsed.parsed.percentage;
            }

            totalUsed += usage;
            return { ...sibling, usage, mode: parsed.mode };
        });

        return { totalUsed, siblings: siblingData };
    };

    const siblingUsage = calculateSiblingUsage();
    const isOverallocated = siblingUsage && siblingUsage.totalUsed > 100;

    const renderModeSpecificFields = () => {
        switch (capacityValue.mode) {
            case 'percentage':
                return (
                    <TextField
                        fullWidth
                        type="number"
                        label="Percentage"
                        value={capacityValue.parsed?.percentage || 10}
                        onChange={(e) => handleValueChange('percentage', parseFloat(e.target.value) || 0)}
                        InputProps={{
                            endAdornment: '%',
                            inputProps: { min: 0, max: 100, step: 0.1 },
                        }}
                        sx={{ mt: 2 }}
                    />
                );

            case 'weight':
                return (
                    <TextField
                        fullWidth
                        type="number"
                        label="Weight"
                        value={capacityValue.parsed?.weight || 1}
                        onChange={(e) => handleValueChange('weight', parseFloat(e.target.value) || 0)}
                        InputProps={{
                            endAdornment: 'w',
                            inputProps: { min: 0, step: 0.1 },
                        }}
                        sx={{ mt: 2 }}
                    />
                );

            case 'absolute':
                return (
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Memory (MB)"
                            value={capacityValue.parsed?.memory || 1024}
                            onChange={(e) => handleValueChange('memory', parseInt(e.target.value) || 0)}
                            InputProps={{
                                endAdornment: 'MB',
                                inputProps: { min: 0, step: 128 },
                            }}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="VCores"
                            value={capacityValue.parsed?.vcores || 1}
                            onChange={(e) => handleValueChange('vcores', parseInt(e.target.value) || 0)}
                            InputProps={{
                                inputProps: { min: 0, step: 1 },
                            }}
                        />
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {label}
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Capacity Mode</InputLabel>
                <Select
                    value={capacityValue.mode}
                    onChange={(e) => handleModeChange(e.target.value as CapacityMode)}
                    label="Capacity Mode"
                >
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                    <MenuItem value="weight">Weight (w)</MenuItem>
                    <MenuItem value="absolute">Absolute Resources</MenuItem>
                </Select>
            </FormControl>

            {renderModeSpecificFields()}

            <Box sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    Current Value:
                </Typography>
                <Chip label={capacityValue.value} size="small" />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            {siblingUsage && (
                <Card sx={{ mt: 2 }}>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                            Sibling Queue Usage
                        </Typography>

                        {isOverallocated && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Total allocation exceeds 100% ({siblingUsage.totalUsed.toFixed(1)}%)
                            </Alert>
                        )}

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Total Used: {siblingUsage.totalUsed.toFixed(1)}%
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(siblingUsage.totalUsed, 100)}
                                color={isOverallocated ? 'error' : 'primary'}
                                sx={{ mt: 1 }}
                            />
                        </Box>

                        {siblingUsage.siblings.map((sibling, index) => (
                            <Box
                                key={`${sibling.name}-${index}`}
                                sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                                <Typography variant="body2">
                                    {sibling.name}: {sibling.usage.toFixed(1)}%
                                </Typography>
                                <Chip label={sibling.mode} size="small" variant="outlined" />
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
