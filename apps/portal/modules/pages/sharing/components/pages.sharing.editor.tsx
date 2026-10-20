'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { DialogFooter } from '@/shared/components/ui/dialog';
import { callAction, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { PAGE_SHARING_SAVE_FAILURE_MESSAGE } from '../constants/pages.sharing.constants';
import { usePagesSharingDraft } from '../hooks/use.pages.sharing.draft';
import { listMembersToAdd, needsConfirmation, readDraftPermissions } from '../lib/pages.sharing.lib';
import { setBlockPermissionsAction } from '../server/actions/pages.sharing.actions';
import type { BlockAccess, SharingChange, SharingScope, SharingVerdict } from '../types/pages.sharing.types';
import { PagesSharingAddPerson } from './pages.sharing.add-person';
import { PagesSharingEntryList } from './pages.sharing.entry.list';
import { PagesSharingMode } from './pages.sharing.mode';
import { PagesSharingVerdict } from './pages.sharing.verdict';

interface IProps {
  readonly access: BlockAccess;
  readonly onChanged: (change: SharingChange) => void;
  readonly onClose: () => void;
  readonly scope: SharingScope;
  readonly spaceId: string;
}

export const PagesSharingEditor = ({ access, onChanged, onClose, scope, spaceId }: IProps) => {
  const t = useTranslations('pages.sharing');
  const tCommon = useTranslations('common');
  const sharing = usePagesSharingDraft(access);
  const [confirmedVerdict, setConfirmedVerdict] = useState<SharingVerdict | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOwn = sharing.draft.kind === 'own';
  const listedEntries = isOwn ? sharing.entries : access.inherited.entries;
  const isConfirmed = confirmedVerdict === sharing.verdict;
  const isBlocked = sharing.verdict === 'lockout' || (needsConfirmation(sharing.verdict) && !isConfirmed);

  const save = (): void => {
    setFailureMessage(null);
    startTransition(async () => {
      const result = await callAction(() =>
        setBlockPermissionsAction({
          blockId: access.blockId,
          permissions: readDraftPermissions(sharing.draft),
          spaceId,
        }),
      );
      if (!isActionSuccess(result)) {
        setFailureMessage(PAGE_SHARING_SAVE_FAILURE_MESSAGE[readActionFailureReason(result)]);
        return;
      }
      toast.success(t('saved'));
      onChanged({ blockId: access.blockId, hasOwnPermissions: isOwn });
      onClose();
    });
  };

  return (
    <>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <PagesSharingMode
          access={access}
          draft={sharing.draft}
          isDisabled={isPending}
          onResume={sharing.resumeInheriting}
          onStop={sharing.stopInheriting}
          scope={scope}
        />
        {listedEntries.length > 0 && (
          <PagesSharingEntryList
            access={access}
            entries={listedEntries}
            isEditable={isOwn}
            onRemove={sharing.removeEntry}
            onRoleChange={sharing.changeRole}
          />
        )}
        {isOwn && (
          <PagesSharingAddPerson
            candidates={listMembersToAdd(access.members, sharing.entries)}
            onAdd={sharing.addMember}
          />
        )}
        <PagesSharingVerdict
          isConfirmed={isConfirmed}
          onConfirmedChange={(checked) => setConfirmedVerdict(checked ? sharing.verdict : null)}
          scope={scope}
          verdict={sharing.verdict}
        />
        {failureMessage !== null && (
          <p className="text-destructive text-sm" role="alert">
            {t(failureMessage)}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button className="min-h-11" disabled={isPending} onClick={onClose} type="button" variant="outline">
          {tCommon('cancel')}
        </Button>
        <Button
          className="min-h-11"
          disabled={isPending || !sharing.isChanged || isBlocked}
          onClick={save}
          type="button"
        >
          {isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </>
  );
};
