'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ACCESS_TOKEN_TARGET_KIND_VALUES } from '../constants/access-tokens.constants';
import type {
  AccessTokenDraftTarget,
  AccessTokenPageOption,
  AccessTokenSpaceOption,
  AccessTokenTargetKind,
} from '../types/access-tokens.types';
import { AccessTokensChoiceGroup } from './access-tokens.choice.group';
import { AccessTokensPagePicker } from './access-tokens.page.picker';

interface IProps {
  readonly availableKinds: readonly AccessTokenTargetKind[];
  readonly excludedPageIds: readonly string[];
  readonly onKind: (kind: AccessTokenTargetKind) => void;
  readonly onTarget: (target: AccessTokenDraftTarget) => void;
  readonly spaceOptions: readonly AccessTokenSpaceOption[];
  readonly target: AccessTokenDraftTarget;
}

export const AccessTokensTargetPicker = ({
  availableKinds,
  excludedPageIds,
  onKind,
  onTarget,
  spaceOptions,
  target,
}: IProps) => {
  const t = useTranslations('accessTokens.form');
  const placeId = useId();

  return (
    <div className="space-y-3">
      <AccessTokensChoiceGroup
        legend={t('place')}
        name={`${placeId}-kind`}
        onChange={onKind}
        options={ACCESS_TOKEN_TARGET_KIND_VALUES.map((kind) => ({
          isDisabled: !availableKinds.includes(kind),
          label: t(`targetKinds.${kind}`),
          value: kind,
        }))}
        value={target.kind}
      />
      {target.kind === 'SPACE' && (
        <div className="space-y-2">
          <Label htmlFor={`${placeId}-space`}>{t('space')}</Label>
          <Select onValueChange={(spaceId) => onTarget({ kind: 'SPACE', spaceId })} value={target.spaceId}>
            <SelectTrigger className="min-h-11 w-full" id={`${placeId}-space`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {spaceOptions.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {target.kind === 'PAGE' && (
        <div className="space-y-2">
          <p className="font-medium text-foreground text-sm" id={`${placeId}-page`}>
            {t('page')}
          </p>
          <AccessTokensPagePicker
            excludedPageIds={excludedPageIds}
            labelId={`${placeId}-page`}
            onChoose={(page: AccessTokenPageOption) => onTarget({ kind: 'PAGE', page })}
            page={target.page}
          />
          <p className="text-muted-foreground text-xs">{t('pageHint')}</p>
        </div>
      )}
    </div>
  );
};
