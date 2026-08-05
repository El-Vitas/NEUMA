import { z } from 'zod';
import { getPageAttachmentResponse } from '@/modules/pages/server/lib/pages.attachments.server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';

interface IProps {
  readonly params: Promise<{ assetId: string }>;
}

export const GET = async (_request: Request, { params }: IProps): Promise<Response> => {
  const { assetId } = await params;
  if (!z.uuid().safeParse(assetId).success) return new Response(null, { status: 404 });

  let accessToken: string;
  try {
    accessToken = await requireAccessTokenCookie();
  } catch {
    return new Response(null, { status: 401 });
  }

  const response = await getPageAttachmentResponse(assetId, accessToken);
  if (!response.ok) return new Response(null, { status: response.status });

  const headers = new Headers();
  const contentDisposition = response.headers.get('content-disposition');
  const contentType = response.headers.get('content-type');
  if (contentDisposition !== null) headers.set('content-disposition', contentDisposition);
  if (contentType !== null) headers.set('content-type', contentType);
  return new Response(response.body, { headers, status: response.status });
};
