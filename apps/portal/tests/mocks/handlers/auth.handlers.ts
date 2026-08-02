import { HttpResponse, http } from 'msw';

import { BASE } from './constants/handler.constants';

export const authHandlers = [
  http.post(`${BASE}/api/v1/auth/sessions`, () => {
    return HttpResponse.json({
      token: 'test-token',
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      },
    });
  }),

  http.get(`${BASE}/api/v1/auth/sessions/current`, () => {
    return HttpResponse.json({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    });
  }),
];
