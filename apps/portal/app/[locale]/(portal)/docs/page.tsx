import { getLocale } from 'next-intl/server';
import { readDocsEntries } from '@/modules/docs/server/lib/docs.content.server';
import { DocsView } from '@/modules/docs/views/docs.view';

export default async function Page() {
  const locale = await getLocale();

  return <DocsView entries={await readDocsEntries(locale)} />;
}
