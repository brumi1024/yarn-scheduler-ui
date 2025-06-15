import React from 'react';
import { FormControl, Select, MenuItem, InputLabel, FormHelperText } from '@mui/material';

interface EnumFieldProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    options?: string[];
    error?: string;
    inputRef?: React.Ref<any>;
}

export function EnumField({ value, onChange, label, options = [], error, inputRef }: EnumFieldProps) {
    return (
        <FormControl fullWidth error={!!error}>
            <InputLabel>{label}</InputLabel>
            <Select value={value || ''} onChange={(e) => onChange(e.target.value)} label={label} inputRef={inputRef}>
                {options.map((option) => (
                    <MenuItem key={option} value={option}>
                        {option}
                    </MenuItem>
                ))}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
    );
}
