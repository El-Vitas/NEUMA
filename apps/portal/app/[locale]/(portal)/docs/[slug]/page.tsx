import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { readDocsDocument } from '@/modules/docs/server/lib/docs.content.server';
import { DocsArticleView } from '@/modules/docs/views/docs.article.view';

/**
 * El documento se lee en el idioma de quien mira y detrás de su sesión, así que
 * se resuelve entero antes de responder, en vez de prometer una navegación
 * instantánea que no existe.
 */
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
