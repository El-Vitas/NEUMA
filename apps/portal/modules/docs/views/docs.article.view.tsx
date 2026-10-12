import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { DocsContents } from '../components/docs.contents';
import { DocsMarkdown } from '../components/docs.markdown';
import { DOCS_ARTICLE_LAYOUT_STYLE_CLASS, DOCS_READING_WIDTH_STYLE_CLASS } from '../constants/docs.style.constants';
import { readDocsHeadings } from '../lib/docs.headings.lib';
import type { DocsDocument } from '../types/docs.types';

interface IProps {
  readonly document: DocsDocument;
}

export const DocsArticleView = async ({ document }: IProps) => {
  const t = await getTranslations('docs');
  const headings = readDocsHeadings(document.markdown);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 p-4 sm:p-8 lg:pt-12">
      <Link className="text-muted-foreground text-sm hover:text-foreground" href={ROUTES.PORTAL_DOCS}>
        {t('back')}
      </Link>
      <div className={DOCS_ARTICLE_LAYOUT_STYLE_CLASS}>
        <div className={`${DOCS_READING_WIDTH_STYLE_CLASS} space-y-7`}>
          <PageHeader subtitle={document.summary} title={document.title} />
          <DocsMarkdown markdown={document.markdown} />
        </div>
        <aside className="mt-10 lg:sticky lg:top-12 lg:mt-2">
          <DocsContents headings={headings} title={t('contents')} />
        </aside>
      </div>
    </main>
  );
};
