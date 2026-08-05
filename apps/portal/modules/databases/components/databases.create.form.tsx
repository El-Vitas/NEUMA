'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { hasActionError } from '@/shared/lib/action-result';
import { DATABASE_TEMPLATE_OPTIONS } from '../constants/databases.constants';
import { createDatabaseSchema } from '../schemas/databases.schemas';
import { createDatabaseAction } from '../server/actions/databases.actions';
import type { DatabaseSpaceOption } from '../types/databases.types';

interface IProps {
  readonly spaces: readonly DatabaseSpaceOption[];
}

export const DatabasesCreateForm = ({ spaces }: IProps) => {
  const t = useTranslations('databases');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? '');
  const [template, setTemplate] = useState<(typeof DATABASE_TEMPLATE_OPTIONS)[number]['value']>(
    DATABASE_TEMPLATE_OPTIONS[0].value,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isValid = createDatabaseSchema.safeParse({ name, slug, spaceId, template }).success;

  const resetForm = () => {
    setName('');
    setSlug('');
    setSpaceId(spaces[0]?.id ?? '');
    setTemplate(DATABASE_TEMPLATE_OPTIONS[0].value);
    setSubmitError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createDatabaseAction({ name, slug, spaceId, template });

      if (hasActionError(result)) {
        setSubmitError(result.serverError ?? t('createError'));
        toast.error(result.serverError ?? t('createError'));
        return;
      }

      toast.success(t('created'));
      setOpen(false);
      resetForm();
    } catch {
      setSubmitError(t('createError'));
      toast.error(t('createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className="min-h-11" type="button">
          <Plus aria-hidden="true" className="size-4" />
          {t('newDatabase')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createDatabase')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {submitError && <FormErrorBanner message={submitError} />}
          <div className="space-y-2">
            <Label htmlFor="database-name">{t('name')}</Label>
            <Input
              className="min-h-11"
              id="database-name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="database-slug">{t('slug')}</Label>
            <Input
              className="min-h-11"
              id="database-slug"
              onChange={(event) => setSlug(event.target.value)}
              required
              value={slug}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="database-space">{t('space')}</Label>
            <Select onValueChange={setSpaceId} value={spaceId}>
              <SelectTrigger aria-label={t('space')} className="min-h-11 w-full" id="database-space">
                <SelectValue placeholder={t('selectSpace')} />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-2">
            <legend className="font-medium text-sm">{t('template')}</legend>
            <div className="flex flex-wrap gap-2">
              {DATABASE_TEMPLATE_OPTIONS.map((option) => (
                <label
                  className="flex min-h-11 flex-1 items-center gap-2 border border-border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5"
                  key={option.value}
                >
                  <input
                    checked={template === option.value}
                    className="size-4"
                    name="database-template"
                    onChange={() => setTemplate(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  {t(`templates.${option.value}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-3">
            <Button className="min-h-11" disabled={isSubmitting || !isValid} type="submit">
              {isSubmitting ? t('creating') : t('create')}
            </Button>
            <DialogClose asChild>
              <Button className="min-h-11" disabled={isSubmitting} type="button" variant="outline">
                {t('cancelCreate')}
              </Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
