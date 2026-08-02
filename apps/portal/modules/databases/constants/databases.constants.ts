export const DATABASES_CACHE_TAG = 'databases';

export const DATABASE_API_ROUTES = {
  list: '/api/v1/databases',
  item: (databaseId: string) => `/api/v1/databases/${databaseId}`,
  records: (databaseId: string) => `/api/v1/databases/${databaseId}/records`,
} as const;

export const DATABASE_TEMPLATE_OPTIONS = [{ value: 'TASKS' }, { value: 'PROJECTS' }] as const;
