'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { isActionSuccess } from '@/shared/lib/action-result';
import { SPACE_DESCRIPTION_MAX_LENGTH, SPACE_NAME_MAX_LENGTH } from '../constants/spaces.constants';
import { describeSpaceAction, renameSpaceAction } from '../server/actions/spaces.actions';
import type { SpaceSummary } from '../types/spaces.types';

interface IProps {
  readonly space: SpaceSummary;
}

/** Sends only the fields that changed, so an untouched one does not cause a needless write. */
export const SpacesSettingsForm = ({ space }: IProps) => {
  const t = useTranslations('spaces.settings');
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description ?? '');
  const [isSaving, startTransition] = useTransition();
  const nameFieldId = useId();
  const descriptionFieldId = useId();

  const save = (): void => {
    startTransition(async () => {
      const renamed = name.trim() !== space.name;
      const described = description.trim() !== (space.description ?? '');
      if (!renamed && !described) return;

      const outcomes = await Promise.all([
        renamed ? renameSpaceAction({ name: name.trim(), spaceId: space.id }) : null,
        described ? describeSpaceAction({ description: description.trim(), spaceId: space.id }) : null,
      ]);
      if (outcomes.some((outcome) => outcome !== null && !isActionSuccess(outcome))) {
        toast.error(t('error'));
        return;
      }
      toast.success(t('saved'));
    });
  };

  return (
    <form
      className="max-w-prose space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={nameFieldId}>{t('nameLabel')}</Label>
        <Input
          id={nameFieldId}
          maxLength={SPACE_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={descriptionFieldId}>{t('descriptionLabel')}</Label>
        <Input
          id={descriptionFieldId}
          maxLength={SPACE_DESCRIPTION_MAX_LENGTH}
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
        <p className="text-muted-foreground text-sm">{t('descriptionHint')}</p>
      </div>

      <PrimaryButton disabled={isSaving || name.trim().length === 0} type="submit">
        {isSaving ? t('saving') : t('save')}
      </PrimaryButton>
    </form>
  );
};
