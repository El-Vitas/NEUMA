import { z } from 'zod';
import { PAGE_ASSET_PASSED_HEADERS } from '@/modules/pages/constants/pages.attachments.constants';
import { getPageAttachmentResponse } from '@/modules/pages/server/lib/pages.attachments.server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';

interface IProps {
  readonly params: Promise<{ assetId: string }>;
}

export const GET = async (request: Request, { params }: IProps): Promise<Response> => {
  const { assetId } = await params;
  if (!z.uuid().safeParse(assetId).success) return new Response(null, { status: 404 });

  let accessToken: string;
  try {
    accessToken = await requireAccessTokenCookie();
  } catch {
    return new Response(null, { status: 401 });
  }

  const response = await getPageAttachmentResponse(assetId, accessToken, request.headers.get('range'));
  if (!response.ok) return new Response(null, { status: response.status });

  const headers = new Headers();
  for (const name of PAGE_ASSET_PASSED_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  return new Response(response.body, { headers, status: response.status });
};
