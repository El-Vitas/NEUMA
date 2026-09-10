# 14 · Revisión y aprobación de cambios

Que un documento del que alguien responde no se pueda cambiar sin que esa persona lo mire.

> Leer `README.md` de esta carpeta antes de usar este documento.
>
> Aquí no se revisa **si** una página es confiable —eso es `PG-20` en
> `04-paginas-y-navegacion.md`— sino qué consecuencias tiene serlo. Tampoco se
> revisa el bloqueo manual de `PG-18`, que es otra cosa: un interruptor que
> cierra la página entera. Los comentarios sobre un bloque (`CL-03` a `CL-05`)
> y el historial de versiones (`CL-08`) se dan por existentes y se usan desde
> aquí.

## Qué se busca

Una página verificada que además tiene responsables asignados deja de ser un
documento cualquiera: alguien dio la cara por lo que dice. Cambiarla a mano,
sin que esa persona se entere, deshace en un segundo lo que el sello prometía.

Por eso una página así **no se edita, se propone**. Cualquiera que pueda
escribir en ella escribe lo mismo que escribiría siempre, pero lo que teclea no
reemplaza el texto: queda como una propuesta sobre los bloques que tocó. Los
responsables la miran bloque por bloque y responden una de tres cosas —la
aprueban, la rechazan, o piden cambios— y cada una de las tres puede llevar un
comentario que dice por qué.

**La modalidad es la de una revisión de código, no su pantalla.** Lo que se
toma prestado es el ciclo: un cambio propuesto, un antes y un después visibles,
alguien que responde, un comentario pegado al sitio exacto, y nada que entre al
documento hasta que la respuesta llegó. Lo que **no** se toma prestado es su
vocabulario ni su interfaz: aquí no hay ramas, ni fusiones, ni conflictos de
tres vías, y quien propone un cambio en un párrafo no debería tener que
aprender ninguna de esas palabras.

## Cómo está construido hoy

**Nada de este documento existe.** Lo que hay son los tres pedazos sueltos que
lo harían posible:

- Una página se marca como verificada, con quién y cuándo, y con una caducidad
  opcional (`PG-20`, construido).
- Una página admite **una** persona responsable, guardada y mostrada, que hoy
  no habilita ni impide nada (`PG-20`, construido).
- Una página se bloquea a mano contra escritura (`PG-18`, construido).
- Hay comentarios sobre un bloque y sobre un fragmento (`CL-03`, construido
  pero sin verificar).

El modo sugerencia de `CL-10` está declarado y **no construido**. Ese bloque y
este describen la misma mecánica desde dos lados: `CL-10` es la herramienta
—escribir sin aplicar— y `14` es lo que la obliga a aparecer y quién manda
sobre ella. Se construyen juntos o el segundo no tiene sobre qué apoyarse; lo
que no puede pasar es que salgan dos mecanismos distintos de proponer cambios.

Falta además el cimiento de `RV-07`: no existen avisos ni tareas programadas en
el producto.

---

## RV-01 · Debe reservar a dos personas el pedir verificación

> Pedir verificación no es marcar una casilla: es elegir a quién se le pide.
> Por eso lo puede hacer poca gente. Si cualquiera pudiera pedirla y nombrarse
> a sí mismo aprobador, el sello lo firmaría quien quisiera y no diría nada.

- [ ] Solo dos personas pueden pedir la verificación de una página: quien administra el espacio y quien creó la página
- [ ] Nadie más ve la acción de pedirla
- [ ] Quien la pide elige quién aprueba
- [ ] Puede elegir a una persona o a varias
- [ ] Puede elegirse a sí mismo
- [ ] Se busca a cada persona escribiendo, no en una lista larga
- [ ] Se ve quién pidió la verificación y a quiénes se la pidió
- [ ] Quien la pidió puede cambiar la lista de aprobadores mientras la página siga protegida
- [ ] Cambiar la lista con propuestas abiertas no las tira: se recalcula qué les falta para aplicarse
- [ ] Una persona que deja el espacio deja de contar como aprobador y la página lo dice
- [ ] Quitar al último aprobador se avisa, porque desprotege la página
- [ ] Los aprobadores elegidos son los responsables de la página, y se muestran como tales sin abrir ningún menú
- [ ] Ser responsable no da ningún permiso extra sobre la página fuera de aprobar

## RV-02 · Debe proteger la página que tiene sello y dueño

- [ ] Una página verificada **y con responsables** no acepta edición directa
- [ ] Se ve por qué no se puede escribir, y se distingue del bloqueo manual de `PG-18`
- [ ] Una página verificada **sin** responsables se edita normalmente
- [ ] Una página con responsables **sin** verificar se edita normalmente
- [ ] Quitar la verificación libera la página, y se advierte antes de hacerlo
- [ ] Quitar al último responsable libera la página, y se advierte antes de hacerlo
- [ ] Una verificación caducada mantiene la protección — un documento vencido es el que más necesita que lo miren
- [ ] La protección no impide comentar
- [ ] La protección no impide leer, buscar, exportar ni enlazar
- [ ] Un responsable tampoco escribe directo: propone como todo el mundo
- [ ] Quien administra el espacio tampoco escribe directo
- [ ] Quien creó la página tampoco escribe directo
- [ ] No existe ninguna forma de saltarse la protección sin quitar antes la verificación o los responsables, y quitarlas queda registrado

## RV-03 · Debe convertir lo que se escribe en una propuesta

- [ ] Escribir en un bloque de una página protegida abre una propuesta sobre ese bloque
- [ ] La propuesta dice qué bloque toca, qué decía antes y qué diría después
- [ ] Se ve quién la propuso y cuándo
- [ ] Escribir varias veces seguidas en el mismo bloque no crea varias propuestas
- [ ] Una propuesta puede tocar varios bloques a la vez
- [ ] Se le puede poner un título y un motivo antes de enviarla
- [ ] Se puede abandonar antes de enviarla, y el documento queda como estaba
- [ ] Mientras no se envía, solo la ve quien la escribe
- [ ] Enviada, quien la propuso todavía puede corregirla; nadie más
- [ ] Se puede tener más de una propuesta abierta sobre la misma página

## RV-04 · Debe alcanzar a todo lo que cambia la página, no solo al texto

- [ ] Agregar un bloque nuevo es una propuesta
- [ ] Borrar un bloque es una propuesta
- [ ] Mover un bloque de sitio es una propuesta
- [ ] Cambiar el título de la página es una propuesta
- [ ] Cambiar el valor de una propiedad es una propuesta
- [ ] Adjuntar o quitar un archivo es una propuesta
- [ ] Enviar la página a la papelera pasa por propuesta
- [ ] Mover la página de sitio en el árbol **no** pasa por propuesta: no cambia lo que dice
- [ ] Cambiar el ícono, la portada o la tipografía **no** pasa por propuesta: no cambia lo que dice

## RV-05 · Debe permitir revisar la propuesta bloque a bloque

- [ ] Se ve la lista de propuestas abiertas de la página
- [ ] Se abre una propuesta y se lee el antes y el después de cada bloque
- [ ] Se puede aprobar la propuesta
- [ ] Se puede rechazarla
- [ ] Se pueden pedir cambios
- [ ] Cualquiera de las tres respuestas admite un comentario que dice por qué
- [ ] Pedir cambios y rechazar exigen ese comentario; aprobar no
- [ ] Se puede comentar un bloque concreto de la propuesta, no solo la propuesta entera
- [ ] Se puede responder a ese comentario y sigue el hilo
- [ ] Se ve qué respondió cada responsable y cuándo
- [ ] Quien propuso puede contestar y volver a enviar sin abrir otra propuesta
- [ ] Volver a enviar deja las respuestas anteriores a la vista, no las borra

## RV-06 · Debe decir con claridad cuándo se puede aplicar

- [ ] Una propuesta aprobada se puede aplicar
- [ ] Una con cambios pedidos no se aplica hasta que se resuelvan
- [ ] Una rechazada se cierra y no se aplica
- [ ] Se ve qué falta para poder aplicarla, sin tener que deducirlo
- [ ] Quien propuso no aprueba su propia propuesta
- [ ] Hacen falta las aprobaciones de todos los responsables elegidos: se pidió a esas personas, no a una cualquiera de ellas
- [ ] Se ve quién ya respondió y quién falta, por nombre
- [ ] Si quien propuso es uno de los responsables, su aprobación no se le cuenta ni se le espera
- [ ] Aplicarla la escribe en la página de una sola vez, no bloque por bloque
- [ ] Aplicarla queda como una versión en el historial de la página (`CL-08`)
- [ ] Esa versión dice de qué propuesta salió
- [ ] Aplicarla no toca la verificación: el sello y su fecha quedan como estaban

## RV-07 · Debe manejar la propuesta que se quedó vieja

- [ ] Si un bloque cambió por otra propuesta aplicada antes, se avisa
- [ ] Una propuesta que ya no encaja no se aplica en silencio
- [ ] Se ve dónde está el desencuentro, bloque por bloque
- [ ] Se puede rehacer la propuesta sobre el estado actual sin escribirla de nuevo entera
- [ ] Aplicar dos propuestas que tocan bloques distintos no obliga a rehacer ninguna

## RV-08 · Debe avisar a quien le toca actuar

- [ ] Al responsable le llega que hay una propuesta esperándolo
- [ ] A quien propuso le llega la decisión, con el comentario que la acompañó
- [ ] Se ve cuántas propuestas esperan sin entrar a la página
- [ ] Una propuesta que lleva mucho tiempo sin respuesta se nota
- [ ] Los avisos se pueden apagar sin perder la lista de pendientes

## RV-09 · Debe dejar rastro de todo

- [ ] Una propuesta rechazada se guarda igual que una aplicada
- [ ] Se ve el historial de propuestas de la página, con su estado
- [ ] Se ve quién aprobó qué y cuándo
- [ ] Los comentarios de la revisión quedan con la propuesta
- [ ] Una propuesta no se puede borrar para tapar el rastro
- [ ] Ese historial se ve aunque la página deje de estar protegida

## RV-10 · Debe portarse bien con quien solo lee

- [ ] Quien no puede escribir en la página no ve nada de propuestas
- [ ] Una página protegida se lee exactamente igual que cualquier otra
- [ ] Lo propuesto y no aplicado no se lee como si fuera el contenido de la página
- [ ] Lo propuesto y no aplicado no aparece en la búsqueda como contenido de la página
- [ ] Lo propuesto y no aplicado no viaja en una exportación
- [ ] Lo que el agente lee por MCP es la página, no sus propuestas
- [ ] Una propuesta no muestra contenido a quien no tiene acceso a la página

---

## Lo decidido, y lo que trae puesto

Cuatro preguntas cuya respuesta sostiene las casillas de arriba, decididas el
2026-09-10. Aquí queda anotado también lo que cada una cuesta, porque ninguna
sale gratis.

Viven aquí y no en `docs/business-rules/`: ese registro dice cómo se comporta
el producto, y una regla `active` sobre algo que no existe le miente a quien lo
consulte. `FEA-REV` está creado y vacío, esperando: las reglas se escriben
cuando esto se construya, y salen de estas cuatro respuestas y de las casillas
de arriba.

1. **Nadie se salta la protección.** Ni el responsable, ni quien administra, ni
   quien creó la página. Es lo que hace que el sello signifique algo. **Lo que
   cuesta:** una página se queda encallada si sus responsables no están, y la
   única salida es quitarle la verificación — que queda registrado, y que es
   exactamente lo que debería costar.
2. **Quien pide la verificación elige a los aprobadores, y hacen falta todos.**
   Pedirla es cosa de dos personas: quien administra el espacio o quien creó la
   página, y cualquiera de las dos puede elegirse a sí misma. **Lo que cuesta:**
   elegir a cuatro personas es comprometerse a esperar a las cuatro para cada
   coma; el remedio no es rebajar el número sino elegir a menos gente al pedirla.
3. **Caducar no libera la página.** Un documento vencido es el que más necesita
   que lo miren. **Lo que cuesta:** una página se puede quedar protegida para
   siempre si nadie renueva el sello.
4. **Aplicar una propuesta no renueva la verificación.** El sello y su fecha
   quedan como estaban. Si algún día `PG-20` invalidara el sello al editar —hoy
   no lo hace—, aplicar una propuesta aprobada sería justo el caso donde no
   debería invalidarlo, porque el responsable acaba de mirarla.

---

## Bitácora

| Fecha | Bloque | Qué faltó | Resultado |
|---|---|---|---|
| — | — | Documento recién escrito. Ningún bloque medido. | — |
