import React from 'react';
import { TextField } from '@mui/material';

interface StringFieldProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    error?: string;
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
    inputRef?: React.Ref<any>;
}

export function StringField({
    value,
    onChange,
    label,
    error,
    placeholder,
    multiline = false,
    rows = 1,
    inputRef,
}: StringFieldProps) {
    return (
        <TextField
            fullWidth
            label={label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            error={!!error}
            helperText={error}
            placeholder={placeholder}
            multiline={multiline}
            rows={multiline ? rows : 1}
            inputRef={inputRef}
        />
    );
}
