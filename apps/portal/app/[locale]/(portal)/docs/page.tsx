import { getLocale } from 'next-intl/server';
import { readDocsEntries } from '@/modules/docs/server/lib/docs.content.server';
import { DocsView } from '@/modules/docs/views/docs.view';

/**
 * La lista de documentos se lee en el idioma de quien mira y detrás de su
 * sesión, así que se resuelve entera antes de responder, en vez de prometer una
 * navegación instantánea que no existe.
 */
export const instant = false;

export default async function Page() {
  const locale = await getLocale();

  return <DocsView entries={await readDocsEntries(locale)} />;
}
