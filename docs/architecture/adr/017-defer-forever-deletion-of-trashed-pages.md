# 017: Diferir 30 días la eliminación para siempre de las páginas en la papelera

**Status:** Accepted
**Date:** 2026-10-19

## Context

Vaciar la papelera borraba en una sola llamada todas las páginas en la papelera de los espacios del usuario, con su historial y sus adjuntos, sin registro de quién lo pidió. Lo podía hacer cualquier rol que no fuera CLIENT. La revisión de seguridad del 18 de octubre de 2026 lo marcó como riesgo alto: es la operación de la app que más datos destruye y la única que no tiene vuelta atrás.

Los respaldos permiten volver a un minuto concreto, pero restaurar una base entera para recuperar una página afecta a todo el resto.

## Alternatives Considered

- **Dejar el borrado inmediato y confiar en los respaldos.** PRO: no cambia nada. CON: recuperar una página exige restaurar la base en una instancia aparte y copiar a mano; el borrado sigue sin dejar rastro.
- **Pedir confirmación escribiendo el nombre del espacio.** PRO: frena el clic accidental. CON: no frena una decisión equivocada ni un token robado, y sigue borrando en el acto.
- **Borrado diferido, solo para administradores, con registro.** PRO: el error se corrige restaurando desde la papelera durante 30 días; el registro sobrevive a la página. CON: el espacio y los adjuntos tardan 30 días en liberarse.

## Decision

Eliminar para siempre, una página o la papelera entera, marca la página con `purgeAfter` a 30 días y escribe una fila en `PagePurge` con quién lo pidió. La página sigue en la papelera y se restaura como cualquier otra; restaurarla cancela el borrado. Un proceso del servidor HTTP corre cada hora, bajo un candado de Postgres, borra lo vencido y recién entonces borra los archivos adjuntos. Solo un administrador puede pedir el borrado.

## Consequences

- Positivas: un borrado equivocado se deshace durante 30 días sin tocar los respaldos, y `PagePurge` dice quién pidió cada borrado y cómo terminó.
- Negativas: los adjuntos ocupan disco 30 días más. Un trabajador ya no puede vaciar la papelera. Si el servidor HTTP no corre, nada se purga hasta que vuelva.

## Governance

Las pruebas de integración de la papelera verifican que vaciar no borra, que la purga respeta el plazo, que restaurar cancela y que solo un administrador puede pedirlo. La regla de negocio vive en FEA-PAG.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-19
