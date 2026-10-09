import { createSafeActionClient } from 'next-safe-action';
import { readActionFailureReasonOf } from '@/shared/lib/action-failure.lib';

/**
 * El cliente de acciones de las pruebas: el mismo de la aplicación, con el
 * mismo manejo de fallos, así cada acción valida su entrada contra su esquema
 * como en producción.
 *
 * Una sola fábrica para todas las pruebas que reemplazan este módulo: dos
 * fábricas distintas del mismo módulo se pisan si las pruebas corren juntas, y
 * una imitación que no valida la entrada deja sin probar lo que una acción, que
 * es una puerta pública, rechaza.
 */
export const createSafeActionMock = () => ({
  actionClient: createSafeActionClient({ handleServerError: readActionFailureReasonOf }),
});
