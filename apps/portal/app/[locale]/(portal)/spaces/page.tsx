import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { SpacesView } from '@/modules/spaces/views/spaces.view';

export default async function Page() {
  const result = await getSpaces();
  return <SpacesView spaces={result.isOk() ? result.getValue() : null} />;
}
