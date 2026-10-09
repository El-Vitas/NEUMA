import { useTranslations } from 'next-intl';
import { StartPageButton } from '@/shared/components/portal/start-page-button';
import { EmptyState } from '@/shared/components/ui/empty-state';

interface IProps {
  readonly canCreatePage: boolean;
  readonly spaceId: string;
}

export const SpacesEmptyState = ({ canCreatePage, spaceId }: IProps) => {
  const t = useTranslations('spaces');

  return (
    <main className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <EmptyState
        action={
          canCreatePage ? <StartPageButton label={t('emptyState.createFirstPage')} spaceId={spaceId} /> : undefined
        }
        message={t('emptyState.description')}
      />
    </main>
  );
};
