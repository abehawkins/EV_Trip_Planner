'use client';

import { Drawer } from 'vaul';

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export default function MobileDrawer({ open, onOpenChange, children }: MobileDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-30 sm:hidden" />
        <Drawer.Content className="bg-card flex flex-col rounded-t-2xl fixed bottom-0 left-0 right-0 z-40 max-h-[85vh] sm:hidden">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mt-3 mb-2" />
          <Drawer.Title className="sr-only">EV Trip Planner Controls</Drawer.Title>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
