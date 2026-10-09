import {
  LINK_PREVIEW_MAXIMUM_HOPS,
  PAGE_LINK_PREVIEW_READ_LIMIT,
  PAGE_LINK_PREVIEW_TIMEOUT_MS,
} from '@/modules/pages/links/constants/pages.link-preview.constants';
import { isReachableLinkPreviewAddress } from '@/modules/pages/links/lib/pages.link-preview.address.lib';
import { readLinkPreviewFromHtml } from '@/modules/pages/links/lib/pages.link-preview.lib';
import { linkPreviewRequestSchema } from '@/modules/pages/links/schemas/pages.link-preview.schemas';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';

/** Redirects are followed manually so every hop is checked: a remote site could redirect to an internal address. */
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
