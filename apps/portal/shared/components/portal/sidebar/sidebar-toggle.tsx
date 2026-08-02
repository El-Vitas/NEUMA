'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarToggleProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

export const SidebarToggle = ({ collapsed, onToggle }: SidebarToggleProps) => {
  return (
    <button
      aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      className="absolute top-20 -right-4 z-20 flex size-11 items-center justify-center rounded-full border border-sidebar-border text-sidebar-foreground/70 shadow-sm hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onToggle}
      title={collapsed ? 'Expandir' : 'Colapsar'}
      type="button"
    >
      {collapsed ? (
        <ChevronRight aria-hidden="true" className="size-4" />
      ) : (
        <ChevronLeft aria-hidden="true" className="size-4" />
      )}
    </button>
  );
};
