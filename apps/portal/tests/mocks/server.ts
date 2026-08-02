import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth.handlers';
import { usersHandlers } from './handlers/users.handlers';

export const server = setupServer(...usersHandlers, ...authHandlers);
