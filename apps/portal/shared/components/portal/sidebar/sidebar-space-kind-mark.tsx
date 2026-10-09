'use client';

import { Lock, UserRoundCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PortalSpaceKind } from '@/modules/portal/types/portal.types';

interface IProps {
  readonly kind: PortalSpaceKind;
}

/** The text label travels with the glyph so screen-reader users also get the space kind. */
export const SidebarSpaceKindMark = ({ kind }: IProps) => {
  const t = useTranslations('spaces.privacy');

  if (kind === 'own') return null;

  const label = kind === 'private' ? t('treePrivate') : t('treeShared');

  return (
    <span className="shrink-0 text-sidebar-foreground/55" title={label}>
      {kind === 'private' ? (
        <Lock aria-hidden="true" className="size-3" />
      ) : (
        <UserRoundCheck aria-hidden="true" className="size-3" />
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
};
