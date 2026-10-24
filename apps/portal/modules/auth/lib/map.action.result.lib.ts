import { INITIAL_FORM_STATE } from '../constants/auth.form.constants';
import type { ActionResult, FormMessageKey, FormState } from '../types/auth.form.types';

/** A refused sign-in is always the same message, so it never says whether the email or the password was wrong. */
const readMessageKeyOfFailure = (reason: string): FormMessageKey => {
  switch (reason) {
    case 'forbidden':
      return 'invalidCredentials';
    case 'offline':
      return 'offline';
    case 'rateLimited':
      return 'rateLimited';
    default:
      return 'unexpected';
  }
};

export const mapActionResultToState = (result: ActionResult): FormState => {
  if (result.serverError !== undefined) {
    return { message: '', messageKey: readMessageKeyOfFailure(result.serverError) };
  }
  if (result.validationErrors !== undefined) {
    return { message: '', messageKey: 'validationError' };
  }
  return INITIAL_FORM_STATE;
};
