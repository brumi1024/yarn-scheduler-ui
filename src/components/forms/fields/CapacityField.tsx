import React from 'react';
import { CapacityEditor } from '../../CapacityEditor';

interface CapacityFieldProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    error?: string;
    siblings?: Array<{ name: string; capacity: string }>;
}

export function CapacityField({ value, onChange, label, error, siblings }: CapacityFieldProps) {
    return <CapacityEditor label={label} value={value || ''} onChange={onChange} error={error} siblings={siblings} />;
}
