import { readField } from '@/shared/lib/form-data';
import { loginAction } from '../actions/auth.actions';
import type { FormState } from '../types/auth.form.types';
import { mapActionResultToState } from './map.action.result.lib';

export const submitLogin = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
  const result = await loginAction({
    email: readField(formData, 'email'),
    password: readField(formData, 'password'),
  });
  return mapActionResultToState(result);
};
