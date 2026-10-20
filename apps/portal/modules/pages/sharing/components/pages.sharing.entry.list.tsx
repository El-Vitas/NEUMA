'use client';

import type { BlockRole } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { listRoleChoices, readEntryKey } from '../lib/pages.sharing.lib';
import type { BlockAccess, SharingEntry, SharingPrincipal } from '../types/pages.sharing.types';
import { PagesSharingEntryRow } from './pages.sharing.entry.row';

interface IProps {
  readonly access: BlockAccess;
  readonly entries: readonly SharingEntry[];
  readonly isEditable: boolean;
  readonly onRemove: (principal: SharingPrincipal) => void;
  readonly onRoleChange: (principal: SharingPrincipal, role: BlockRole) => void;
}

export const PagesSharingEntryList = ({ access, entries, isEditable, onRemove, onRoleChange }: IProps) => {
  const t = useTranslations('pages.sharing');

  return (
    <section aria-labelledby="pages-sharing-people" className="space-y-1">
      <h3 className="font-medium text-sm" id="pages-sharing-people">
        {t('people')}
      </h3>
      {!isEditable && <p className="text-muted-foreground text-xs">{t('inheritedNotice')}</p>}
      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <PagesSharingEntryRow
            choices={listRoleChoices(entry, access.members)}
            entry={entry}
            isEditable={isEditable}
            isViewer={entry.principal.kind === 'user' && entry.principal.userId === access.viewerId}
            key={readEntryKey(entry)}
            onRemove={onRemove}
            onRoleChange={onRoleChange}
          />
        ))}
      </ul>
    </section>
  );
};
