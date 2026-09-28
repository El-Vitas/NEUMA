'use client';

import { isAccessTokenNameTaken, type UserRole } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { ACCESS_TOKEN_DEFAULT_EXPIRY } from '../constants/access-tokens.constants';
import { useAccessTokensDraft } from '../hooks/use.access-tokens.draft';
import {
  canSubmitAccessTokenCreate,
  draftRowsToAccess,
  readExpiresAtInput,
  resolveAccessTokenExpiry,
} from '../lib/access-tokens.lib';
import { createAccessTokenAction } from '../server/actions/access-tokens.actions';
import type { AccessTokenExpiry, AccessTokenSpaceOption, CreatedAccessToken } from '../types/access-tokens.types';
import { AccessTokensAccessEditor } from './access-tokens.access.editor';
import { AccessTokensExpiryField } from './access-tokens.expiry.field';
import { AccessTokensFormFooter } from './access-tokens.form.footer';
import { AccessTokensNameField } from './access-tokens.name.field';

interface IProps {
  readonly onCreated: (created: CreatedAccessToken) => void;
  readonly role: UserRole;
  readonly spaces: readonly AccessTokenSpaceOption[];
  readonly takenNames: readonly string[];
}

/** Nombre, vencimiento y acceso de un token nuevo. Lo que se escribió se conserva si el servidor lo rechaza. */
export const AccessTokensCreateForm = ({ onCreated, role, spaces, takenNames }: IProps) => {
  const t = useTranslations('accessTokens');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState<AccessTokenExpiry>(ACCESS_TOKEN_DEFAULT_EXPIRY);
  const [customDate, setCustomDate] = useState('');
  const draft = useAccessTokensDraft([]);
  const [isPending, startTransition] = useTransition();
  const resolvedExpiry = resolveAccessTokenExpiry(expiry, customDate, new Date());

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const expiresAt = readExpiresAtInput(resolveAccessTokenExpiry(expiry, customDate, new Date()));
    if (expiresAt === undefined) return;
    startTransition(async () => {
      const result = await createAccessTokenAction({ access: draftRowsToAccess(draft.rows), expiresAt, name });
      if (!isActionSuccess<CreatedAccessToken>(result)) {
        toast.error(t(`errors.${readActionFailureReason(result)}`));
        return;
      }
      onCreated(result.data);
    });
  };

  return (
    <form className="space-y-8" onSubmit={submit}>
      <div className="space-y-6">
        <AccessTokensNameField isTaken={isAccessTokenNameTaken(name, takenNames)} onChange={setName} value={name} />
        <AccessTokensExpiryField
          customDate={customDate}
          expiry={expiry}
          onCustomDate={setCustomDate}
          onExpiry={setExpiry}
        />
      </div>
      <div className="border-border border-t pt-8">
        <AccessTokensAccessEditor draft={draft} role={role} spaces={spaces} />
      </div>
      <div className="border-border border-t pt-6">
        <AccessTokensFormFooter
          canSubmit={canSubmitAccessTokenCreate({ expiry: resolvedExpiry, name, rows: draft.rows, takenNames })}
          isPending={isPending}
          pendingLabel={t('form.creating')}
          submitLabel={t('form.submitCreate')}
        />
      </div>
    </form>
  );
};
