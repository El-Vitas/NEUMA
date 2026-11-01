import { env } from '@/config/env.config';

export const config = {
  backendApiUrl: env.BACKEND_URL,
  clientIpTrust: {
    trustedProxyCount: env.TRUSTED_PROXY_COUNT,
    trustsCloudflareHeader: env.TRUST_CLOUDFLARE_IP,
  },
  mcpPublicUrl: env.MCP_PUBLIC_URL,
  nodeEnv: env.NODE_ENV,
} as const;
