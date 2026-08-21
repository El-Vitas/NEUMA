'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/shared/components/ui/popover';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import { fromVerificationExpiryInputValue, toVerificationExpiryInputValue } from '../lib/pages.verification.lib';
import { setPageOwnerAction } from '../server/actions/pages.owner.actions';
import { setPageVerificationAction } from '../server/actions/pages.verification.actions';
import type { PagePersonOption } from '../types/pages.schema.types';
import type { PageAuthor, PageSummary } from '../types/pages.types';
import type { PageVerificationChange, PageVerificationStatus } from '../types/pages.verification.types';
import { PagesMetadataRow } from './pages.metadata.row';
import { PagesPropertiesPersonField } from './pages.properties.person-field';
import { PagesVerificationBadge } from './pages.verification.badge';

interface IProps {
  readonly canEdit: boolean;
  readonly onOwnerChange: (owner: null | PageAuthor) => void;
  readonly onVerificationChange: (fields: PageVerificationChange) => void;
  readonly owner: null | PageAuthor;
  readonly pageId: string;
  readonly personOptions: readonly PagePersonOption[];
  readonly spaceId: string;
  readonly status: PageVerificationStatus;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedBy: null | PageAuthor;
}

/**
 * Whether a page can be trusted, and who answers for it — both asked and set
 * from the same place, because they are both about knowing what a page is
 * worth before reading it, not about what it says.
 */
export const PagesVerificationPanel = ({
  canEdit,
  onOwnerChange,
  onVerificationChange,
  owner,
  pageId,
  personOptions,
  spaceId,
  status,
  verificationExpiresAt,
  verifiedAt,
  verifiedBy,
}: IProps) => {
  const t = useTranslations('pages.verification');
  const ownerT = useTranslations('pages.owner');
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [expiryInput, setExpiryInput] = useState(() => toVerificationExpiryInputValue(verificationExpiresAt));
  const ownerFieldId = useId();

  const formatMoment = (moment: Date): string =>
    format.dateTime(moment, { dateStyle: 'medium', timeStyle: 'short', timeZone: APP_TIME_ZONE });

  const verify = (): void => {
    startTransition(async () => {
      const result = await setPageVerificationAction({
        expiresAt: fromVerificationExpiryInputValue(expiryInput),
        pageId,
        spaceId,
        verified: true,
      });
      if (!isActionSuccess<PageSummary>(result)) {
        toast.error(t('error'));
        return;
      }
      onVerificationChange({
        verificationExpiresAt: result.data.verificationExpiresAt ?? null,
        verifiedAt: result.data.verifiedAt ?? null,
        verifiedBy: result.data.verifiedBy ?? null,
      });
      toast.success(t('verified'));
    });
  };

  const unverify = (): void => {
    startTransition(async () => {
      const result = await setPageVerificationAction({ pageId, spaceId, verified: false });
      if (!isActionSuccess<PageSummary>(result)) {
        toast.error(t('error'));
        return;
      }
      setExpiryInput('');
      onVerificationChange({ verificationExpiresAt: null, verifiedAt: null, verifiedBy: null });
      toast.success(t('unverified'));
    });
  };

  const changeOwner = (nextOwnerId: string): void => {
    startTransition(async () => {
      const result = await setPageOwnerAction({ ownerId: nextOwnerId === '' ? null : nextOwnerId, pageId, spaceId });
      if (!isActionSuccess<PageSummary>(result)) {
        toast.error(ownerT('error'));
        return;
      }
      onOwnerChange(result.data.owner ?? null);
      toast.success(ownerT('changed'));
    });
  };

  return (
    <Popover>
      <PopoverTrigger className="min-h-11 rounded-none px-2 hover:bg-muted" disabled={isPending} type="button">
        <PagesVerificationBadge status={status} />
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-3">
        <PopoverHeader>
          <PopoverTitle>{t('title')}</PopoverTitle>
        </PopoverHeader>
        {verifiedAt !== null && (
          <>
            <PagesMetadataRow label={t('verifiedByLabel')} labelId="page-verification-by">
              {verifiedBy?.name ?? t('unknownVerifier')}
            </PagesMetadataRow>
            <PagesMetadataRow label={t('verifiedAtLabel')} labelId="page-verification-at">
              {formatMoment(verifiedAt)}
            </PagesMetadataRow>
          </>
        )}
        {canEdit && (
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm" htmlFor="page-verification-expiry">
              {t('expiryLabel')}
            </label>
            <Input
              disabled={isPending}
              id="page-verification-expiry"
              onChange={(event) => setExpiryInput(event.target.value)}
              type="date"
              value={expiryInput}
            />
            <div className="flex gap-2">
              <Button disabled={isPending} onClick={verify} size="sm" type="button">
                {status === 'UNVERIFIED' ? t('verify') : t('reVerify')}
              </Button>
              {status !== 'UNVERIFIED' && (
                <Button disabled={isPending} onClick={unverify} size="sm" type="button" variant="outline">
                  {t('unverify')}
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <span className="text-muted-foreground text-sm" id={ownerFieldId}>
            {ownerT('label')}
          </span>
          <PagesPropertiesPersonField
            ariaLabelledBy={ownerFieldId}
            clearLabel={ownerT('none')}
            disabled={!canEdit || isPending}
            fieldId="page-owner-field"
            onChange={changeOwner}
            options={personOptions}
            placeholder={ownerT('placeholder')}
            value={owner?.id ?? ''}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
