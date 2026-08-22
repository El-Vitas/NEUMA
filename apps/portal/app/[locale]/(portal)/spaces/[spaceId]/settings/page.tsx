import { canEditContent, USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SpacesSettingsForm } from '@/modules/spaces/components/spaces.settings.form';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

interface IProps {
  readonly params: Promise<{ spaceId: string }>;
}

/**
 * Where a space is named and says what it is for.
 *
 * A space nobody may write in has nothing to settle here, so the screen is not
 * merely hidden from them — it does not exist for them, the same as a space
 * they cannot reach at all.
 */
export default async function Page({ params }: IProps) {
  const { spaceId } = await params;
  const [spacesResult, user, t] = await Promise.all([
    getSpaces(),
    getCurrentUser(),
    getTranslations('spaces.settings'),
  ]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;

  if (space === undefined || !canEditContent(user?.role ?? USER_ROLE.CLIENT)) notFound();

  return (
    <main className="min-h-full space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-bold text-2xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle', { space: space.name })}</p>
      </header>
      <SpacesSettingsForm space={space} />
    </main>
  );
}
