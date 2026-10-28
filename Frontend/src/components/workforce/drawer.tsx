'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  side?: 'left' | 'right';
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content
          className={'drawer-content drawer-' + side}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <div className="drawer-heading">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mt-1">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={side === 'left' ? 'Close navigation' : 'Close drawer'}
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="drawer-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
