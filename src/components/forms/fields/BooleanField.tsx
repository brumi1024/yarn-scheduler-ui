import React from 'react';
import { Switch, FormControlLabel } from '@mui/material';

interface BooleanFieldProps {
    value: boolean | string;
    onChange: (value: boolean) => void;
    label: string;
    inputRef?: React.Ref<any>;
}

export function BooleanField({ value, onChange, label, inputRef }: BooleanFieldProps) {
    return (
        <FormControlLabel
            control={
                <Switch
                    checked={value === true || value === 'true'}
                    onChange={(e) => onChange(e.target.checked)}
                    inputRef={inputRef}
                />
            }
            label={label}
        />
    );
}
