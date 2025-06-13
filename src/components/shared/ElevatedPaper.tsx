import React from 'react';
import { Paper, styled } from '@mui/material';
import type { PaperProps } from '@mui/material';

interface ElevatedPaperProps extends Omit<PaperProps, 'variant'> {
    variant?: 'standard' | 'floating' | 'overlay';
}

export const ElevatedPaper = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'variant',
})<ElevatedPaperProps>(({ theme, variant = 'standard' }) => {
    const variants = {
        standard: {
            elevation: 2,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
        floating: {
            elevation: 6,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
        },
        overlay: {
            elevation: 12,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)',
        },
    };

    return {
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.spacing(2),
        overflow: 'hidden',
        ...variants[variant],
    };
});

export default ElevatedPaper;