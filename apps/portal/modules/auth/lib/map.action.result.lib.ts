import { INITIAL_FORM_STATE } from '../constants/auth.form.constants';
import type { ActionResult, FormState } from '../types/auth.form.types';

export const mapActionResultToState = (result: ActionResult): FormState => {
  if (result.serverError !== undefined) {
    return { message: result.serverError };
  }
  if (result.validationErrors !== undefined) {
    return { message: '', messageKey: 'validationError' };
  }
  return INITIAL_FORM_STATE;
};
