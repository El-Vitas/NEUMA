'use client';

import { PagesLockToggle } from '../../components/pages.lock.toggle';
import { PagesSharingButton } from './pages.sharing.button';

interface IProps {
  readonly canEdit: boolean;
  readonly hasOwnPermissions: boolean;
  readonly isLocked: boolean;
  readonly onLockChange: (lockedAt: Date | null) => void;
  readonly pageId: string;
  readonly spaceId: string;
  readonly title: string;
}

/** What the page header offers to someone who can edit: who has access, and whether the page is locked. */
export const PagesSharingControls = ({
  canEdit,
  hasOwnPermissions,
  isLocked,
  onLockChange,
  pageId,
  spaceId,
  title,
}: IProps) => {
  if (!canEdit) return null;

  return (
    <>
      <PagesSharingButton hasOwnPermissions={hasOwnPermissions} pageId={pageId} spaceId={spaceId} title={title} />
      <PagesLockToggle isLocked={isLocked} onLockChange={onLockChange} pageId={pageId} spaceId={spaceId} />
    </>
  );
};
