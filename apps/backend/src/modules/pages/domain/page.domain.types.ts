/** A page among those that share a parent. */
export interface PageSibling {
  readonly createdAt: Date;
  readonly id: string;
}

export interface PageParentReference {
  readonly id: string;
  readonly parentId: null | string;
  readonly spaceId: string;
}
