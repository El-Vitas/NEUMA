import {
  LINK_PREVIEW_MAXIMUM_HOPS,
  PAGE_LINK_PREVIEW_READ_LIMIT,
  PAGE_LINK_PREVIEW_TIMEOUT_MS,
} from '@/modules/pages/links/constants/pages.link-preview.constants';
import { isReachableLinkPreviewAddress } from '@/modules/pages/links/lib/pages.link-preview.address.lib';
import { readLinkPreviewFromHtml } from '@/modules/pages/links/lib/pages.link-preview.lib';
import { linkPreviewRequestSchema } from '@/modules/pages/links/schemas/pages.link-preview.schemas';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';

/**
 * What a link says about itself, asked for by the server and never by the
 * browser.
 *
 * Only what a page says about itself is read, and only over https: the page is
 * asking a stranger a question on behalf of whoever is writing, and it should
 * neither carry their session there nor bring back more than a few lines.
 *
 * A site that will not answer, answers slowly, or answers with something that
 * is not a page, is not an error here: the writing simply keeps the link as it
 * was pasted.
 */
/**
 * Asks a site, following where it points but never blindly.
 *
 * Redirects are walked one at a time because a site out on the internet is
 * free to point at an address only this server can reach, and a redirect that
 * is merely followed turns the question into a way in. Every hop is asked the
 * same question the first address was asked.
 */
const askTheSite = async (address: string): Promise<Response | null> => {
  let here = address;
  for (let hop = 0; hop <= LINK_PREVIEW_MAXIMUM_HOPS; hop += 1) {
    if (!isReachableLinkPreviewAddress(here)) return null;
    const answer = await fetch(here, {
      headers: { accept: 'text/html' },
      redirect: 'manual',
      signal: AbortSignal.timeout(PAGE_LINK_PREVIEW_TIMEOUT_MS),
    });
    const next = answer.headers.get('location');
    if (answer.status < 300 || answer.status >= 400 || next === null) return answer;
    here = new URL(next, here).toString();
  }
  return null;
};

export const GET = async (request: Request): Promise<Response> => {
  const asked = linkPreviewRequestSchema.safeParse({ url: new URL(request.url).searchParams.get('url') });
  if (!asked.success) return Response.json({ error: 'invalid-url' }, { status: 400 });

  try {
    await requireAccessTokenCookie();
  } catch {
    return new Response(null, { status: 401 });
  }

  try {
    const answer = await askTheSite(asked.data.url);
    if (answer === null || !answer.ok || !(answer.headers.get('content-type') ?? '').includes('text/html')) {
      return Response.json({ url: asked.data.url });
    }
    const html = (await answer.text()).slice(0, PAGE_LINK_PREVIEW_READ_LIMIT);
    return Response.json(readLinkPreviewFromHtml(html, asked.data.url));
  } catch {
    return Response.json({ url: asked.data.url });
  }
};
