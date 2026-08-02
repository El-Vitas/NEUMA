import { readField } from '@/shared/lib/form-data';
import { loginAction, registerAction } from '../actions/auth.actions';
import type { FormState } from '../types/auth.form.types';
import { mapActionResultToState } from './map.action.result.lib';

export const submitLogin = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
  const result = await loginAction({
    email: readField(formData, 'email'),
    password: readField(formData, 'password'),
  });
  return mapActionResultToState(result);
};

export const submitRegister = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
  const result = await registerAction({
    name: readField(formData, 'name'),
    email: readField(formData, 'email'),
    password: readField(formData, 'password'),
  });
  return mapActionResultToState(result);
};
