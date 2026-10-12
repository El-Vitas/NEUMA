'use client';

import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { hasActionError, readActionFailureReason } from '@/shared/lib/action-result';
import type { SpaceMember } from '@/shared/types/space-members.types';
import { shareSpaceAction } from '../server/actions/spaces.actions';

interface IProps {
  readonly assignableMembers: readonly SpaceMember[];
  readonly spaceId: string;
}

export const SpacesShareForm = ({ assignableMembers, spaceId }: IProps) => {
  const t = useTranslations('spaces.privacy');
  const tErrors = useTranslations('errors');
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedUserId === undefined) return;

    setIsSubmitting(true);
    try {
      const result = await shareSpaceAction({ spaceId, userId: selectedUserId });
      if (hasActionError(result)) {
        toast.error(tErrors(`reasons.${readActionFailureReason(result)}`));
        return;
      }
      toast.success(t('shared'));
      setSelectedUserId(undefined);
    } catch {
      toast.error(t('shareError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (assignableMembers.length === 0) return <p className="text-muted-foreground text-sm">{t('shareEmpty')}</p>;

  return (
    <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
      <Select onValueChange={(value) => setSelectedUserId(value)} value={selectedUserId}>
        <SelectTrigger aria-label={t('shareLabel')} className="min-h-11 w-full sm:w-64">
          <SelectValue placeholder={t('sharePlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {assignableMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button className="min-h-11" disabled={isSubmitting || selectedUserId === undefined} type="submit">
        {isSubmitting ? t('sharing') : t('share')}
      </Button>
    </form>
  );
};
