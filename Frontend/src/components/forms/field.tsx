import { Input } from '@/components/ui/input';
import type { ComponentProps } from 'react';
export function Field({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <Input {...props} id={id} />
    </div>
  );
}
