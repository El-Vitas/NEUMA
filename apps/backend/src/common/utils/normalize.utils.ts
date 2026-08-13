export const normalizeEmail = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 ? undefined : normalized;
};

export const normalizePhone = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.replaceAll(/[\s().-]/g, '');
  return normalized.length === 0 ? undefined : normalized;
};

export const trimText = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
