import { DIAGRAM_ICONS_KEPT_SECONDS, DIAGRAM_ICONS_STALE_SECONDS } from '@/shared/constants/diagram.constants';
import { readDiagramIcons } from '@/shared/server/lib/diagram-icons.server';

const keptFor = [
  'public',
  `max-age=${String(DIAGRAM_ICONS_KEPT_SECONDS)}`,
  `stale-while-revalidate=${String(DIAGRAM_ICONS_STALE_SECONDS)}`,
].join(', ');

/** Served from here so diagrams render without internet access. Packs change only on build, so caching is long. */
export const GET = async (
  _request: Request,
  context: { readonly params: Promise<{ readonly pack: string }> },
): Promise<Response> => {
  const { pack } = await context.params;
  const pictures = readDiagramIcons(pack);
  if (pictures === null) return new Response(null, { status: 404 });
  return Response.json(pictures, { headers: { 'cache-control': keptFor } });
};
