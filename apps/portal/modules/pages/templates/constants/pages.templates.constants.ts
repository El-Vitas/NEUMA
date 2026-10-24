export const PAGE_TEMPLATE_API_ROUTES = {
  item: (spaceId: string, collectionId: string, templateId: string) =>
    `/api/v1/spaces/${spaceId}/pages/${collectionId}/templates/${templateId}`,
  list: (spaceId: string, collectionId: string) => `/api/v1/spaces/${spaceId}/pages/${collectionId}/templates`,
  setDefault: (spaceId: string, collectionId: string) =>
    `/api/v1/spaces/${spaceId}/pages/${collectionId}/templates/default`,
} as const;

/** The value of the "default" choice of a button: it keeps no template of its own. */
export const PAGE_TEMPLATE_DEFAULT_CHOICE = '';
