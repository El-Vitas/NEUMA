'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
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
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? '');
  const [template, setTemplate] = useState<'TASKS' | 'PROJECTS'>('TASKS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await createDatabaseAction({ name, slug, spaceId, template });

      if (hasActionError(result)) {
        toast.error(result.serverError ?? t('createError'));
        return;
      }

      toast.success(t('created'));
      setName('');
      setSlug('');
    } catch {
      toast.error(t('createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4 border bg-card p-4 sm:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="database-name">{t('name')}</Label>
        <Input id="database-name" onChange={(event) => setName(event.target.value)} required value={name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="database-slug">{t('slug')}</Label>
        <Input id="database-slug" onChange={(event) => setSlug(event.target.value)} required value={slug} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="database-space">{t('space')}</Label>
        <Select onValueChange={setSpaceId} value={spaceId}>
          <SelectTrigger aria-label={t('space')} className="w-full" id="database-space">
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
      <div className="space-y-2">
        <Label htmlFor="database-template">{t('template')}</Label>
        <Select
          onValueChange={(value) => {
            const parsedTemplate = createDatabaseSchema.shape.template.safeParse(value);
            if (parsedTemplate.success) setTemplate(parsedTemplate.data);
          }}
          value={template}
        >
          <SelectTrigger aria-label={t('template')} className="w-full" id="database-template">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATABASE_TEMPLATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`templates.${option.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Button disabled={isSubmitting || spaces.length === 0 || !spaceId} type="submit">
          {isSubmitting ? t('creating') : t('create')}
        </Button>
      </div>
    </form>
  );
};
