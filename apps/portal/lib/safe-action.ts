import { createSafeActionClient } from 'next-safe-action';
import { SERVER_ERROR_FALLBACK_MESSAGE } from '@/modules/auth/constants/safe-action.constants';

export const actionClient = createSafeActionClient({
  handleServerError: (error) => {
    if (error instanceof Error) {
      try {
        const raw: unknown = JSON.parse(error.message);
        if (typeof raw === 'object' && raw !== null && 'error' in raw) {
          const rawError = raw.error;
          if (typeof rawError === 'object' && rawError !== null && 'message' in rawError) {
            const message = rawError.message;
            if (typeof message === 'string' && message.length > 0) {
              return message;
            }
          }
        }
      } catch {
        return error.message;
      }
    }
    return SERVER_ERROR_FALLBACK_MESSAGE;
  },
});
