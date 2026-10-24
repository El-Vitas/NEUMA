export interface ClientIpTrust {
  /** Reverse proxies between the internet and the portal, each of which appends the address it received from. */
  readonly trustedProxyCount: number;
  /** Only when the portal accepts traffic from Cloudflare alone, otherwise anyone can set the header. */
  readonly trustsCloudflareHeader: boolean;
}
