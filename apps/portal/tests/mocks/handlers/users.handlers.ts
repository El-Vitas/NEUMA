import { HttpResponse, http } from 'msw';

import { BASE } from './constants/handler.constants';

export const usersHandlers = [
  http.get(`${BASE}/api/v1/users`, () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      },
      {
        id: '2',
        name: 'Another User',
        email: 'another@example.com',
      },
    ]);
  }),

  http.get(`${BASE}/api/v1/users/me`, () => {
    return HttpResponse.json({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    });
  }),
];
