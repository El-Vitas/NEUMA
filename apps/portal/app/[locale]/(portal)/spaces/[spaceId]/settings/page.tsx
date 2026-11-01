import { canEditContent, USER_ROLE } from '@neuma/shared';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SpacesSettingsForm } from '@/modules/spaces/components/spaces.settings.form';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

interface IProps {
  readonly params: Promise<{ spaceId: string }>;
}

/** Users who cannot write in the space get not-found, the same as for a space they cannot reach. */
export default async function Page({ params }: IProps) {
  const [{ spaceId }, spacesResult, user, t] = await Promise.all([
    params,
    getSpaces(),
    getCurrentUser(),
    getTranslations('spaces.settings'),
  ]);
  if (spacesResult.isFail()) throw spacesResult.getError();
  const space = spacesResult.getValue().find((candidate) => candidate.id === spaceId);

  if (space === undefined || !canEditContent(user?.role ?? USER_ROLE.CLIENT)) notFound();

  return (
    <main className="min-h-full space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-bold text-2xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle', { space: space.name })}</p>
      </header>
      <SpacesSettingsForm key={space.id} space={space} />
    </main>
  );
}
