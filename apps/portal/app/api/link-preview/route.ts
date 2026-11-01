import type { User } from '@neuma/shared';
import {
  LINK_PREVIEW_RATE_LIMIT_MAXIMUM,
  LINK_PREVIEW_RATE_LIMIT_TRACKED_KEYS_MAXIMUM,
  LINK_PREVIEW_RATE_LIMIT_WINDOW_MS,
} from '@/modules/pages/links/constants/pages.link-preview.constants';
import { readLinkPreviewFromHtml } from '@/modules/pages/links/lib/pages.link-preview.lib';
import { createLinkPreviewRateLimiter } from '@/modules/pages/links/lib/pages.link-preview.rate-limit.lib';
import { linkPreviewRequestSchema } from '@/modules/pages/links/schemas/pages.link-preview.schemas';
import { fetchLinkPreviewHtml } from '@/modules/pages/links/server/lib/pages.link-preview.fetch.server';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

const rateLimiter = createLinkPreviewRateLimiter({
  maximum: LINK_PREVIEW_RATE_LIMIT_MAXIMUM,
  now: Date.now,
  trackedKeysMaximum: LINK_PREVIEW_RATE_LIMIT_TRACKED_KEYS_MAXIMUM,
  windowMs: LINK_PREVIEW_RATE_LIMIT_WINDOW_MS,
});

/** The backend decides whether the session is real; a cookie that merely exists proves nothing. */
const readSignedInUser = async (): Promise<'unavailable' | User | null> => {
  try {
    return await getCurrentUser();
  } catch {
    return 'unavailable';
  }
};

export const GET = async (request: Request): Promise<Response> => {
  const asked = linkPreviewRequestSchema.safeParse({ url: new URL(request.url).searchParams.get('url') });
  if (!asked.success) return Response.json({ error: 'invalid-url' }, { status: 400 });

  const user = await readSignedInUser();
  if (user === 'unavailable') return new Response(null, { status: 503 });
  if (user === null) return new Response(null, { status: 401 });

  if (!rateLimiter.isAllowed(user.id)) {
    return Response.json({ error: 'too-many-requests' }, { status: 429 });
  }

  try {
    const html = await fetchLinkPreviewHtml(asked.data.url);
    return Response.json(html === null ? { url: asked.data.url } : readLinkPreviewFromHtml(html, asked.data.url));
  } catch {
    return Response.json({ url: asked.data.url });
  }
};
