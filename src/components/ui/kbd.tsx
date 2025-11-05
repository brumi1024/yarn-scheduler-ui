import * as React from 'react';
import { cn } from '~/utils/cn';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

/**
 * Kbd component for displaying keyboard shortcuts
 * Styled to look like a keyboard key
 */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => {
  return (
    <kbd
      ref={ref}
      className={cn(
        'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
        className,
      )}
      {...props}
    />
  );
});
Kbd.displayName = 'Kbd';

export { Kbd };
