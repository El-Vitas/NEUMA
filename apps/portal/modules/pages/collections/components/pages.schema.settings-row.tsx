'use client';

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';

interface IProps {
  readonly icon?: ReactNode;
  readonly label: string;
  readonly onClick: () => void;
  readonly value?: ReactNode;
}

export const PagesSchemaSettingsRow = ({ icon, label, onClick, value }: IProps) => (
  <button
    className={cn(
      'flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted',
      FOCUS_RING_CLASS,
    )}
    onClick={onClick}
    type="button"
  >
    {icon !== undefined && <span className="shrink-0 text-muted-foreground">{icon}</span>}
    <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
    {value !== undefined && <span className="shrink-0 truncate text-muted-foreground text-xs">{value}</span>}
    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
  </button>
);
