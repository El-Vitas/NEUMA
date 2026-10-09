import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { DocsEntry } from '../types/docs.types';

interface IProps {
  readonly entries: readonly DocsEntry[];
}

export const DocsView = async ({ entries }: IProps) => {
  const t = await getTranslations('docs');

  return (
    <main className="mx-auto w-full max-w-4xl space-y-7 p-4 sm:p-8 lg:pt-12">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />
      {entries.length === 0 && <p className="text-muted-foreground text-sm">{t('empty')}</p>}
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.slug}>
            <Link
              className="block border border-border bg-surface-low p-4 transition-colors hover:border-foreground/30"
              href={ROUTES.PORTAL_DOC(entry.slug)}
            >
              <h2 className="font-semibold text-base text-foreground">{entry.title}</h2>
              <p className="mt-1 text-muted-foreground text-sm">{entry.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};
