import type { ApiErrorOptions, ParsedError } from '../types/api.types';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(status: number, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code;
    this.data = options.data;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const text = await response.text();
    const parsed = parseErrorPayload(response, text);
    return new ApiError(response.status, parsed.message, {
      code: parsed.code,
      data: parsed.data,
    });
  }
}

const parseErrorPayload = (response: Response, text: string): ParsedError => {
  if (text === '') return { message: response.statusText };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { message: text };
  }

  if (typeof raw !== 'object' || raw === null) {
    return { message: String(raw) };
  }

  const envelope = extractEnvelope(raw);
  if (envelope !== null) {
    return { message: envelope.message, code: envelope.code, data: raw };
  }

  const legacy = extractLegacyMessage(raw);
  if (legacy !== null) {
    return { message: legacy, data: raw };
  }

  return { message: response.statusText, data: raw };
};

const extractEnvelope = (obj: object): { message: string; code?: string } | null => {
  if (!('error' in obj)) return null;
  const errorField: unknown = obj.error;
  if (typeof errorField !== 'object' || errorField === null) return null;

  if (!('message' in errorField)) return null;
  const message: unknown = errorField.message;
  if (typeof message !== 'string') return null;

  const result: { message: string; code?: string } = { message };
  if ('code' in errorField && typeof errorField.code === 'string') {
    result.code = errorField.code;
  }
  return result;
};

const extractLegacyMessage = (obj: object): string | null => {
  if (!('message' in obj)) return null;
  const messageField: unknown = obj.message;
  return typeof messageField === 'string' ? messageField : null;
};
