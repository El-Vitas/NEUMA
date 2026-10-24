export const PAGE_VERSIONS_PAGE_SIZE = 20;

export const PAGE_VERSION_API_ROUTES = {
  list: (spaceId: string, pageId: string, cursor?: number) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/versions?limit=${String(PAGE_VERSIONS_PAGE_SIZE)}${
      cursor === undefined ? '' : `&cursor=${String(cursor)}`
    }`,
  read: (spaceId: string, pageId: string, version: number) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/versions/${String(version)}`,
  restore: (spaceId: string, pageId: string, version: number) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/versions/${String(version)}/restore`,
} as const;
