# 04 · Colaboración y permisos

Trabajar varias personas sobre lo mismo, y controlar quién ve qué.

> Leer `README.md` de esta carpeta antes de usar este documento. Varios bloques exigen dos navegadores o dos sesiones distintas para probarse.

---

## CL-01 · Debe permitir que dos personas escriban a la vez

**Cómo probarlo:** abre la misma página en dos pestañas con sesiones distintas.

- [ ] Lo que escribe una aparece en la otra sin recargar
- [ ] Escribir en el mismo párrafo al mismo tiempo no pisa el texto ajeno
- [ ] El cursor propio no salta de lugar cuando la otra persona edita más arriba
- [ ] Al perder conexión se avisa
- [ ] Al volver la conexión se reconcilia sin duplicar ni perder texto
- [ ] Entrar tarde a una página ya editada muestra el estado actual completo
- [ ] Cerrar una pestaña no afecta a la otra

## CL-02 · Debe mostrar quién está en la página

- [ ] Se ven los avatares de quienes están viendo la página
- [ ] Se ve el cursor de la otra persona mientras escribe
- [ ] Cada persona tiene un color propio
- [ ] Al pasar el cursor sobre el cursor ajeno se ve de quién es
- [ ] Se ve el texto que la otra persona tiene seleccionado
- [ ] Cuando alguien se va, su cursor desaparece

## CL-03 · Debe permitir comentar sobre un texto seleccionado

**Cómo probarlo:** selecciona una frase en medio de un párrafo y comenta sobre ella.

- [ ] Al seleccionar texto se ofrece comentar
- [ ] Hay un atajo de teclado para comentar la selección
- [ ] El texto comentado queda resaltado en el cuerpo
- [ ] Al hacer clic en el texto resaltado se abre su comentario
- [ ] Los comentarios se ven al costado, sin tapar el contenido
- [ ] Se ve quién comentó y cuándo
- [ ] Se puede comentar sobre una palabra, una frase o varios párrafos
- [ ] Un mismo párrafo puede tener varios comentarios sobre partes distintas
- [ ] Editar el texto alrededor no desancla el comentario
- [ ] Si se borra el texto comentado, el comentario no desaparece en silencio: queda accesible
- [ ] Se puede comentar sobre una imagen, una tabla o un bloque de código
- [ ] Los comentarios sobreviven a mover el bloque dentro de la página

## CL-04 · Debe permitir conversar en el comentario

- [ ] Se puede responder a un comentario
- [ ] Las respuestas se ven como hilo, no como comentarios sueltos
- [ ] Se puede mencionar a alguien dentro de un comentario
- [ ] La persona mencionada se entera
- [ ] Se puede dar formato al texto del comentario
- [ ] Se puede adjuntar una imagen a un comentario
- [ ] Se puede editar el comentario propio
- [ ] Se puede eliminar el comentario propio
- [ ] No se puede editar el comentario de otra persona
- [ ] Un comentario editado lo indica

## CL-05 · Debe permitir cerrar las conversaciones

- [ ] Un hilo se puede marcar como resuelto
- [ ] Al resolverlo, el resaltado desaparece del texto
- [ ] Los resueltos se pueden volver a ver
- [ ] Un hilo resuelto se puede reabrir
- [ ] Se ve el conteo de comentarios abiertos de la página
- [ ] Existe un panel con todos los comentarios de la página
- [ ] Desde ese panel se salta al lugar exacto del texto

## CL-06 · Debe permitir comentar la página completa

- [ ] Se puede dejar un comentario general, no anclado a un texto
- [ ] Se ve arriba de la página o en un panel propio
- [ ] Admite respuestas igual que los anclados
- [ ] Se distingue de los comentarios anclados

## CL-07 · Debe avisar lo que a uno le importa

- [ ] Existe una bandeja de novedades
- [ ] Avisa cuando a uno lo mencionan
- [ ] Avisa cuando responden un comentario propio
- [ ] Avisa cuando alguien comenta en una página que uno sigue
- [ ] Avisa cuando a uno le asignan una fila
- [ ] Se puede marcar como leído
- [ ] Se puede seguir una página para enterarse de sus cambios
- [ ] Se puede dejar de seguir
- [ ] Se ve un indicador cuando hay novedades sin leer

## CL-08 · Debe guardar el historial de la página

- [ ] Se puede ver la lista de versiones anteriores
- [ ] Cada versión indica fecha y quién la hizo
- [ ] Se puede abrir una versión anterior y leerla
- [ ] Se ve qué cambió respecto de la anterior
- [ ] Se puede restaurar una versión anterior
- [ ] Restaurar no borra el historial: queda como una versión más
- [ ] El historial no crece de forma que ensucie la lista con cada tecla

## CL-09 · Debe mostrar la actividad reciente

- [ ] En la página se ve quién la editó por última vez y cuándo
- [ ] El espacio muestra su actividad reciente
- [ ] La fecha se muestra en formato relativo legible ("hace 2 horas")

## CL-10 · Debe permitir proponer cambios sin aplicarlos

- [ ] Existe un modo de sugerencia
- [ ] Lo escrito en ese modo se ve como propuesta, no como texto definitivo
- [ ] Se ve quién propuso cada cambio
- [ ] Se puede aceptar una sugerencia y se integra al texto
- [ ] Se puede rechazar y el texto queda como estaba
- [ ] Se pueden aceptar o rechazar todas juntas
- [ ] Se puede comentar sobre una sugerencia

---

## PM-01 · Debe permitir controlar la visibilidad del espacio

- [ ] Un espacio puede ser visible para toda la organización
- [ ] Un espacio puede ser restringido a sus miembros
- [ ] Se puede cambiar la visibilidad después de creado
- [ ] Al restringirlo se advierte quién va a perder acceso
- [ ] Un espacio restringido no aparece en el árbol de quien no es miembro
- [ ] Su contenido no aparece en las búsquedas de quien no es miembro

## PM-02 · Debe permitir administrar los miembros del espacio

- [ ] Se puede agregar una persona al espacio
- [ ] Se puede quitar
- [ ] Se ve la lista de miembros con su rol
- [ ] Se puede cambiar el rol de un miembro
- [ ] Se busca a la persona escribiendo, no en una lista larga
- [ ] Quien no tiene permiso de administrar no ve estas acciones

## PM-03 · Debe distinguir lo que cada rol puede hacer

- [ ] Un rol de solo lectura puede leer pero no editar
- [ ] A quien solo puede leer no se le muestran botones de edición
- [ ] Existe un rol que puede comentar pero no editar
- [ ] Quien administra puede gestionar miembros y configuración
- [ ] Intentar una acción sin permiso da un mensaje claro, no un error genérico
- [ ] El rol se refleja igual en la interfaz y en la respuesta del servidor

## PM-04 · Debe permitir permisos por página

- [ ] Una página puede tener permisos distintos a los de su espacio
- [ ] Se puede compartir una página con alguien puntual
- [ ] Las páginas hijas heredan el permiso de la madre
- [ ] Se puede romper la herencia en una página hija
- [ ] Se ve claramente cuándo una página tiene permisos propios
- [ ] Una página restringida no aparece en las búsquedas de quien no tiene acceso
- [ ] Una mención a una página sin acceso no revela su título

## PM-05 · Debe permitir invitados externos

- [ ] Se puede invitar a alguien fuera de la organización a una página concreta
- [ ] El invitado ve solo eso, nada más
- [ ] Se ve la lista de invitados y a qué tienen acceso
- [ ] Se puede revocar el acceso

## PM-06 · Debe permitir publicar

- [ ] Una página se puede publicar con un enlace público
- [ ] El enlace funciona sin iniciar sesión
- [ ] Se puede elegir si las páginas hijas también quedan públicas
- [ ] Se puede despublicar y el enlace deja de funcionar
- [ ] Se ve con claridad cuándo una página está publicada
- [ ] La versión pública no expone comentarios ni datos internos
- [ ] Se puede impedir que la versión pública se copie o se duplique

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
