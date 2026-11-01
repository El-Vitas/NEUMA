import { assertProductionVariables } from './config/env.config';

export const register = (): void => {
  assertProductionVariables();
};
