'use client';

import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TableAction } from '@/shared/types/table.types';

interface IProps {
  actions: TableAction[];
}

export const TableActionsCell = ({ actions }: IProps) => {
  const t = useTranslations('common');
  const [isPending, setIsPending] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('openActions')}
          className="flex size-8 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          disabled={isPending}
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            className={action.destructive ? 'text-destructive' : ''}
            disabled={isPending}
            key={action.label}
            onSelect={async (e) => {
              if (action.href) return;
              e.preventDefault();
              if (!action.onClick) return;
              setIsPending(true);
              try {
                await action.onClick();
              } catch {
                toast.error(t('actionError'));
              } finally {
                setIsPending(false);
              }
            }}
          >
            {action.href ? (
              <a className="flex items-center gap-2" href={action.href}>
                {action.icon}
                {action.label}
              </a>
            ) : (
              <span className="flex items-center gap-2">
                {action.icon}
                {isPending && action.destructive ? t('deleting') : action.label}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
