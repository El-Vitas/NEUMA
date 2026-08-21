'use client';

import { Lock, UserRoundCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PortalSpaceKind } from '@/modules/portal/types/portal.types';

interface IProps {
  readonly kind: PortalSpaceKind;
}

/**
 * Says apart the space everyone shares, the corner that is one's own, and the
 * corner somebody else opened up.
 *
 * The drawing is what is seen at a glance, but it is never the whole message:
 * the word travels with it for whoever reads the tree by ear, since a padlock
 * and an open door look alike to anybody who cannot see either.
 */
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
