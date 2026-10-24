export interface RefreshSessionRecord {
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly familyId: string;
  readonly id: string;
  readonly replacedById: string | null;
  readonly usedAt: Date | null;
  readonly userId: string;
}

export interface RefreshRotationRequest {
  readonly now: Date;
  readonly successorExpiresAt: Date;
  readonly tokenId: string;
  readonly userId: string;
}

/**
 * `rotated`: the presented token was spent and a successor issued. `replayed`: it was spent a moment ago and its
 * successor is handed out again. `reused`: it was spent long ago, so its family was revoked. `unknown`: no live row.
 */
export type RefreshRotationOutcome =
  | { readonly session: RefreshSessionRecord; readonly status: 'replayed' }
  | { readonly session: RefreshSessionRecord; readonly status: 'rotated' }
  | { readonly status: 'reused' }
  | { readonly status: 'unknown' };
