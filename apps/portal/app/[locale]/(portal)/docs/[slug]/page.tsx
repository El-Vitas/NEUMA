import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { readDocsDocument } from '@/modules/docs/server/lib/docs.content.server';
import { DocsArticleView } from '@/modules/docs/views/docs.article.view';

/** Depends on the locale and the session, so it resolves fully before responding. */
export const instant = false;

interface IProps {
  readonly params: Promise<{ readonly slug: string }>;
}

export default async function Page({ params }: IProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const document = await readDocsDocument(locale, slug);
  if (document === null) notFound();

  return <DocsArticleView document={document} />;
}
