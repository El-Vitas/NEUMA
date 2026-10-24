'use client';

import type { BlockRole } from '@neuma/shared';
import { Users, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { PAGE_SHARING_SELECT_CLASS } from '../constants/pages.sharing.constants';
import { isOfferedRole } from '../lib/pages.sharing.lib';
import type { SharingEntry, SharingPrincipal } from '../types/pages.sharing.types';

interface IProps {
  readonly choices: readonly BlockRole[];
  readonly entry: SharingEntry;
  readonly isEditable: boolean;
  readonly isViewer: boolean;
  readonly onRemove: (principal: SharingPrincipal) => void;
  readonly onRoleChange: (principal: SharingPrincipal, role: BlockRole) => void;
}

export const PagesSharingEntryRow = ({ choices, entry, isEditable, isViewer, onRemove, onRoleChange }: IProps) => {
  const t = useTranslations('pages.sharing');
  const isSpace = entry.principal.kind === 'space';
  const name = isSpace ? t('spaceEntry') : (entry.user?.name ?? t('unknownPerson'));
  const detail = isSpace ? t('spaceEntryHint') : (entry.user?.email ?? '');

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center bg-muted font-medium text-muted-foreground text-sm"
      >
        {isSpace ? <Users className="size-4" /> : name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate font-medium text-sm">
          {name}
          {isViewer && <span className="ml-2 font-normal text-muted-foreground text-xs">{t('you')}</span>}
        </p>
        {detail !== '' && <p className="truncate text-muted-foreground text-xs">{detail}</p>}
      </div>
      {isEditable ? (
        <div className="flex items-center gap-1">
          <select
            aria-label={t('roleFor', { name })}
            className={cn(PAGE_SHARING_SELECT_CLASS, 'w-36')}
            onChange={(event) => {
              if (isOfferedRole(event.target.value, choices)) onRoleChange(entry.principal, event.target.value);
            }}
            value={entry.role}
          >
            {choices.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
          <button
            aria-label={t('remove', { name })}
            className={cn(
              'grid size-11 shrink-0 place-items-center text-muted-foreground hover:text-foreground',
              FOCUS_RING_CLASS,
            )}
            onClick={() => onRemove(entry.principal)}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">{t(`roles.${entry.role}`)}</span>
      )}
    </li>
  );
};
