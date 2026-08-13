'use client';

import { SPACE_VISIBILITY } from '@company-brain/shared';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormActions } from '@/shared/components/forms/form-actions';
import { BackButton } from '@/shared/components/ui/back-button';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SPACE_NAME_MAX_LENGTH, SPACE_SLUG_MAX_LENGTH } from '../constants/spaces.constants';
import { getSpaceFieldErrorCode, resolveSpaceFieldErrorMessage } from '../lib/spaces.lib';
import { createSpaceSchema } from '../schemas/spaces.schemas';
import { createSpaceAction } from '../server/actions/spaces.actions';
import type { SpaceSummary, SpaceVisibility } from '../types/spaces.types';

export const SpacesCreateForm = () => {
  const router = useRouter();
  const t = useTranslations('spaces');
  const validationT = useTranslations('validation');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] = useState<SpaceVisibility>(SPACE_VISIBILITY.PUBLIC_INTERNAL);
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [isSlugTouched, setIsSlugTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameValidationIssue = getSpaceFieldErrorCode(createSpaceSchema.shape.name, name);
  const slugValidationIssue = getSpaceFieldErrorCode(createSpaceSchema.shape.slug, slug);
  const isSlugValid = slugValidationIssue === undefined;
  const nameErrorMessage = isNameTouched
    ? resolveSpaceFieldErrorMessage(nameValidationIssue, validationT('nameTooShort'))
    : undefined;
  const slugErrorMessage = isSlugTouched
    ? resolveSpaceFieldErrorMessage(slugValidationIssue, validationT('slugRequired'))
    : undefined;

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsNameTouched(true);
    setIsSlugTouched(true);
    if (nameValidationIssue !== undefined || !isSlugValid) return;

    setIsSubmitting(true);
    try {
      const result = await createSpaceAction({ name, slug, visibility });
      if (!isActionSuccess<SpaceSummary>(result)) {
        toast.error(hasActionError(result) ? (result.serverError ?? t('createError')) : t('createError'));
        return;
      }
      toast.success(t('created'));
      router.replace(ROUTES.PORTAL_SPACE(result.data.id));
    } catch {
      toast.error(t('createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-6 border bg-surface p-4 sm:p-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="space-name">{t('name')}</Label>
        <Input
          aria-describedby={nameErrorMessage ? 'space-name-error' : undefined}
          aria-invalid={nameErrorMessage !== undefined}
          className="min-h-11"
          id="space-name"
          maxLength={SPACE_NAME_MAX_LENGTH}
          onBlur={() => setIsNameTouched(true)}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        {nameErrorMessage && (
          <p className="text-destructive text-sm" id="space-name-error" role="alert">
            {nameErrorMessage}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="space-slug">{t('slug')}</Label>
        <Input
          aria-describedby={slugErrorMessage ? 'space-slug-error' : undefined}
          aria-invalid={slugErrorMessage !== undefined}
          className="min-h-11"
          id="space-slug"
          maxLength={SPACE_SLUG_MAX_LENGTH}
          onBlur={() => setIsSlugTouched(true)}
          onChange={(event) => setSlug(event.target.value)}
          required
          value={slug}
        />
        {slugErrorMessage && (
          <p className="text-destructive text-sm" id="space-slug-error" role="alert">
            {slugErrorMessage}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="space-visibility">{t('visibility.label')}</Label>
        <Select
          onValueChange={(value) => {
            const parsedVisibility = createSpaceSchema.shape.visibility.safeParse(value);
            if (parsedVisibility.success) setVisibility(parsedVisibility.data);
          }}
          value={visibility}
        >
          <SelectTrigger aria-label={t('visibility.label')} className="min-h-11 w-full" id="space-visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SPACE_VISIBILITY.PUBLIC_INTERNAL}>{t('visibility.internal')}</SelectItem>
            <SelectItem value={SPACE_VISIBILITY.RESTRICTED}>{t('visibility.restricted')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">{t(`visibility.description.${visibility}`)}</p>
      </div>
      <FormActions back={<BackButton href={ROUTES.PORTAL_SPACES} />}>
        <Button
          className="min-h-11"
          disabled={isSubmitting || nameValidationIssue !== undefined || !isSlugValid}
          type="submit"
        >
          {isSubmitting ? t('creating') : t('create')}
        </Button>
      </FormActions>
    </form>
  );
};
