import {
  PAGE_LINK_PREVIEW_READ_LIMIT,
  PAGE_LINK_PREVIEW_TIMEOUT_MS,
} from '@/modules/pages/constants/pages.link-preview.constants';
import { readLinkPreviewFromHtml } from '@/modules/pages/lib/pages.link-preview.lib';
import { linkPreviewRequestSchema } from '@/modules/pages/schemas/pages.link-preview.schemas';
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
export const GET = async (request: Request): Promise<Response> => {
  const asked = linkPreviewRequestSchema.safeParse({ url: new URL(request.url).searchParams.get('url') });
  if (!asked.success) return Response.json({ error: 'invalid-url' }, { status: 400 });

  try {
    await requireAccessTokenCookie();
  } catch {
    return new Response(null, { status: 401 });
  }

  try {
    const answer = await fetch(asked.data.url, {
      headers: { accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(PAGE_LINK_PREVIEW_TIMEOUT_MS),
    });
    if (!answer.ok || !(answer.headers.get('content-type') ?? '').includes('text/html')) {
      return Response.json({ url: asked.data.url });
    }
    const html = (await answer.text()).slice(0, PAGE_LINK_PREVIEW_READ_LIMIT);
    return Response.json(readLinkPreviewFromHtml(html, asked.data.url));
  } catch {
    return Response.json({ url: asked.data.url });
  }
};
