import { z } from 'zod';

export const envSchema = z.object({
  BACKEND_URL: z.url().default('http://localhost:3000'),
  /** Address external agents use; BACKEND_URL may be internal to a container network. */
  MCP_PUBLIC_URL: z.url().default('http://localhost:3000/api/v1/mcp'),
  NEXT_PUBLIC_LIVE_WS_URL: z.url().default('ws://localhost:3000/api/v1/blocks/live'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Reverse proxies in front of the portal; 0 (reached directly) forwards no client address to the backend. */
  TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).default(0),
  /** Set to true only when the portal is reachable through Cloudflare alone. */
  TRUST_CLOUDFLARE_IP: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
});

/** NEXT_PUBLIC_LIVE_WS_URL is left out: Next bakes it into the build, so the running server never has it. */
const PRODUCTION_REQUIRED_VARIABLES = ['BACKEND_URL', 'MCP_PUBLIC_URL'] as const;

/** The local defaults are for development only: a production server pointing at localhost would fail on every page. */
export const findMissingProductionVariables = (raw: Readonly<Record<string, string | undefined>>): string[] => {
  if (raw.NODE_ENV !== 'production') return [];
  return PRODUCTION_REQUIRED_VARIABLES.filter((name) => !raw[name]);
};
