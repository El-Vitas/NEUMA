export const readField = (formData: FormData, field: string): string => {
  const value = formData.get(field);
  return typeof value === 'string' ? value : '';
};

export const readFormData = (formData: FormData): Record<string, string> => {
  const entries = Array.from(formData.entries()).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return Object.fromEntries(entries);
};
