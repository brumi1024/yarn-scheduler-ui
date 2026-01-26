import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '~/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden shadow-sm',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gradient-to-r from-primary to-primary/85 text-primary-foreground [a&]:hover:from-primary/95 [a&]:hover:to-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80',
        destructive:
          'border-transparent bg-gradient-to-r from-destructive to-destructive/85 text-white [a&]:hover:from-destructive/95 [a&]:hover:to-destructive/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:from-destructive/70 dark:to-destructive/55',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground shadow-none',
        success:
          'border-transparent bg-gradient-to-r from-queue-running to-queue-running/85 text-white [a&]:hover:from-queue-running/95 [a&]:hover:to-queue-running/80',
        warning:
          'border-transparent bg-gradient-to-r from-queue-draining to-queue-draining/85 text-white [a&]:hover:from-queue-draining/95 [a&]:hover:to-queue-draining/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
