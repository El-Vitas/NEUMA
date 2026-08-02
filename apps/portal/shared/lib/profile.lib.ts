export const roleLabel = (role: string): string => {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'WORKER') return 'Trabajador';
  return 'Cliente';
};
