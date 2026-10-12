import { getLocale } from 'next-intl/server';
import { readDocsEntries } from '@/modules/docs/server/lib/docs.content.server';
import { DocsView } from '@/modules/docs/views/docs.view';

/** Depends on the locale and the session, so it resolves fully before responding. */
export const instant = false;

export default async function Page() {
  const locale = await getLocale();

  return <DocsView entries={await readDocsEntries(locale)} />;
}
