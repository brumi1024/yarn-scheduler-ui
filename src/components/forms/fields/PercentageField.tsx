import React from 'react';
import { Box, Typography, Slider } from '@mui/material';

interface PercentageFieldProps {
    value: number | string;
    onChange: (value: number) => void;
    label: string;
    error?: string;
    inputRef?: React.Ref<any>;
}

export function PercentageField({ value, onChange, label, error, inputRef }: PercentageFieldProps) {
    const parsedValue = value ? parseFloat(value as string) : 0;
    const percentValue = isNaN(parsedValue) ? 0 : parsedValue * 100;

    return (
        <Box sx={{ px: 1 }}>
            <Typography gutterBottom>
                {label}: {percentValue.toFixed(1)}%
            </Typography>
            <Slider
                value={percentValue}
                onChange={(_, newValue) => {
                    const numValue = newValue as number;
                    onChange(numValue / 100);
                }}
                min={0}
                max={100}
                step={0.1}
                marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                ]}
                sx={{ mt: 1 }}
                ref={inputRef}
            />
            {error && (
                <Typography color="error" variant="caption">
                    {error}
                </Typography>
            )}
        </Box>
    );
}
