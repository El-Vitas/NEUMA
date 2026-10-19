export interface ContentSecurityPolicyOptions {
  /** The live-editing socket, fixed when the image is built (ADR 014). */
  readonly collaborationUrl: string;
  /** `'none'`, or `'self'` where the portal frames its own documents. */
  readonly frameAncestors: string;
  /** The dev server evaluates code for hot reload; production never does. */
  readonly isDevelopment: boolean;
}
