import type { z } from 'zod';

export class EmptyResponseBodyError extends Error {
  constructor() {
    super('La respuesta del servidor está vacía');
    this.name = 'EmptyResponseBodyError';
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('No se pudo conectar con el servidor. Verifica tu conexión.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export const parseJsonBody = async <T>(response: Response, schema?: z.ZodType<T>): Promise<T | undefined> => {
  if (response.status === 204) return;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return;
  }

  const text = await response.text();
  if (text === '') return;

  try {
    const parsed: unknown = JSON.parse(text);
    if (schema) {
      const result = schema.safeParse(parsed);
      return result.success ? result.data : undefined;
    }
    return parsed as T;
  } catch {
    return;
  }
};

export const parseJsonBodyStrict = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) {
    throw new EmptyResponseBodyError();
  }

  const body = await parseJsonBody<T>(response);
  if (body === undefined) {
    throw new EmptyResponseBodyError();
  }
  return body;
};
