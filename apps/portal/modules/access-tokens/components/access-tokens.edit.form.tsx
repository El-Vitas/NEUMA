'use client';

import type { UserRole } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { type SubmitEvent, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { callAction, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { useAccessTokensDraft } from '../hooks/use.access-tokens.draft';
import { accessToDraftRows, canSubmitAccessDraft, draftRowsToAccess } from '../lib/access-tokens.lib';
import { updateAccessTokenAccessAction } from '../server/actions/access-tokens.actions';
import type { AccessToken, AccessTokenSpaceOption } from '../types/access-tokens.types';
import { AccessTokensAccessEditor } from './access-tokens.access.editor';
import { AccessTokensFormFooter } from './access-tokens.form.footer';

interface IProps {
  readonly role: UserRole;
  readonly spaces: readonly AccessTokenSpaceOption[];
  readonly token: AccessToken;
}

/** Access on places its owner can no longer see is not listed and saving removes it, so the user is warned first. */
export const AccessTokensEditForm = ({ role, spaces, token }: IProps) => {
  const t = useTranslations('accessTokens');
  const router = useRouter();
  const draft = useAccessTokensDraft(accessToDraftRows(token));
  const [isPending, startTransition] = useTransition();

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    startTransition(async () => {
      const result = await callAction(() =>
        updateAccessTokenAccessAction({ access: draftRowsToAccess(draft.rows), tokenId: token.id }),
      );
      if (!isActionSuccess<AccessToken>(result)) {
        toast.error(t(`errors.${readActionFailureReason(result)}`));
        return;
      }
      toast.success(t('form.updated'));
      router.push(ROUTES.PORTAL_SETTINGS_TOKENS);
    });
  };

  return (
    <form className="space-y-8" onSubmit={submit}>
      {token.hiddenPlaceCount > 0 && (
        <p className="border border-border bg-surface-container-low p-3 text-foreground text-sm" role="note">
          {t('form.hiddenPlacesWarning', { count: token.hiddenPlaceCount })}
        </p>
      )}
      <AccessTokensAccessEditor draft={draft} role={role} spaces={spaces} />
      <div className="border-border border-t pt-6">
        <AccessTokensFormFooter
          canSubmit={canSubmitAccessDraft(draft.rows)}
          isPending={isPending}
          pendingLabel={t('form.saving')}
          submitLabel={t('form.submitEdit')}
        />
      </div>
    </form>
  );
};
