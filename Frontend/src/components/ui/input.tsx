import * as React from 'react';
import { cn } from '@/lib/utils';
export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-muted',
        className,
      )}
      {...props}
    />
  );
}
