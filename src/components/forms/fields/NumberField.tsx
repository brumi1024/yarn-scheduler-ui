import React from 'react';
import { TextField } from '@mui/material';

interface NumberFieldProps {
    value: number | string;
    onChange: (value: number | string) => void;
    label: string;
    error?: string;
    placeholder?: string;
    step?: string;
    inputRef?: React.Ref<any>;
}

export function NumberField({ value, onChange, label, error, placeholder, step = '1', inputRef }: NumberFieldProps) {
    return (
        <TextField
            fullWidth
            type="number"
            label={label}
            value={value || ''}
            onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                    onChange('');
                } else {
                    const parsed = parseFloat(inputValue);
                    if (!isNaN(parsed)) {
                        onChange(parsed);
                    }
                }
            }}
            error={!!error}
            helperText={error}
            placeholder={placeholder}
            inputProps={{
                step,
            }}
            inputRef={inputRef}
        />
    );
}
