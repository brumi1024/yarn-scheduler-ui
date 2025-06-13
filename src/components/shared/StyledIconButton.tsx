import React from 'react';
import { IconButton, Tooltip, styled } from '@mui/material';
import type { IconButtonProps, TooltipProps } from '@mui/material';

interface StyledIconButtonProps extends Omit<IconButtonProps, 'size'> {
    tooltip?: string;
    tooltipPlacement?: TooltipProps['placement'];
    variant?: 'standard' | 'compact' | 'large';
}

const BaseIconButton = styled(IconButton, {
    shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant?: 'standard' | 'compact' | 'large' }>(({ theme, variant = 'standard' }) => {
    const sizes = {
        compact: { width: 32, height: 32 },
        standard: { width: 40, height: 40 },
        large: { width: 48, height: 48 },
    };

    return {
        width: sizes[variant].width,
        height: sizes[variant].height,
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
        '&:disabled': {
            opacity: 0.5,
        },
    };
});

export const StyledIconButton: React.FC<StyledIconButtonProps> = ({
    tooltip,
    tooltipPlacement = 'top',
    variant = 'standard',
    children,
    disabled,
    ...props
}) => {
    const button = (
        <BaseIconButton variant={variant} disabled={disabled} {...props}>
            {children}
        </BaseIconButton>
    );

    if (tooltip) {
        return (
            <Tooltip title={tooltip} placement={tooltipPlacement}>
                <span>{button}</span>
            </Tooltip>
        );
    }

    return button;
};

export default StyledIconButton;
