import { DIAGRAM_ICONS_KEPT_SECONDS, DIAGRAM_ICONS_STALE_SECONDS } from '@/shared/constants/diagram.constants';
import { readDiagramIcons } from '@/shared/server/lib/diagram-icons.server';

const keptFor = [
  'public',
  `max-age=${String(DIAGRAM_ICONS_KEPT_SECONDS)}`,
  `stale-while-revalidate=${String(DIAGRAM_ICONS_STALE_SECONDS)}`,
].join(', ');

/**
 * A book of the pictures a diagram may name.
 *
 * It is handed over only when a diagram names one, and it is handed over from
 * here: what a page draws is nobody else's business, and a page kept inside a
 * company has to draw itself the same with no way out to the internet.
 *
 * The books only ever change when the page itself is built anew, so whoever
 * asks is told to keep the answer for a good while.
 */
export const GET = async (
  _request: Request,
  context: { readonly params: Promise<{ readonly pack: string }> },
): Promise<Response> => {
  const { pack } = await context.params;
  const pictures = readDiagramIcons(pack);
  if (pictures === null) return new Response(null, { status: 404 });
  return Response.json(pictures, { headers: { 'cache-control': keptFor } });
};
