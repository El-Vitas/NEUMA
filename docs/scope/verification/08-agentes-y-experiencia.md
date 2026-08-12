# 06 · Agentes y experiencia de uso

Lo que hace que el cerebro sea operable por una máquina, y que usarlo sea agradable.

> Leer `README.md` de esta carpeta antes de usar este documento.

---

## AG-01 · Debe permitir que un agente lea el contenido

- [ ] Un agente puede listar los espacios a los que tiene acceso
- [ ] Puede leer una página por su identificador
- [ ] Puede buscar por texto
- [ ] Puede recorrer el árbol de páginas
- [ ] Puede seguir las conexiones entre páginas
- [ ] Puede leer las propiedades y las filas de una colección
- [ ] Solo accede a lo que su identidad tiene permitido
- [ ] Una página sin acceso no revela ni su título
- [ ] Los errores explican qué pasó, no devuelven una respuesta vacía

## AG-02 · Debe permitir que un agente escriba

- [ ] Puede crear una página en un espacio
- [ ] Puede editar el contenido de una página existente
- [ ] Puede editar un bloque puntual sin reescribir la página entera
- [ ] Puede agregar contenido al final sin tocar lo anterior
- [ ] Puede crear una fila en una colección con sus propiedades
- [ ] Puede actualizar las propiedades de una fila
- [ ] Puede mover una página
- [ ] Puede mencionar otra página desde el contenido que escribe
- [ ] Lo que escribe queda registrado como hecho por ese agente
- [ ] Un contenido inválido se rechaza con el motivo, no se guarda a medias
- [ ] Sus cambios aparecen en vivo para quien tenga la página abierta
- [ ] No puede escribir donde su identidad no tiene permiso

## AG-03 · Debe permitir citar contenido de forma precisa

- [ ] Un agente puede referirse a un bloque concreto
- [ ] Esa referencia sigue apuntando al mismo bloque después de editar la página
- [ ] Se puede abrir esa referencia en la interfaz y llegar al bloque
- [ ] Una referencia a un bloque eliminado se reporta como tal, no falla en silencio

---

## UX-01 · Debe verse bien en claro y en oscuro

- [ ] Existe modo oscuro
- [ ] Se puede elegir claro, oscuro o seguir el sistema
- [ ] La preferencia se recuerda entre sesiones
- [ ] No hay destello de tema equivocado al cargar
- [ ] Todo el texto se lee con contraste suficiente en ambos modos
- [ ] Los colores de etiquetas, resaltados y diagramas siguen distinguiéndose en oscuro

## UX-02 · Debe funcionar con el teclado

- [ ] Existe una pantalla que lista los atajos disponibles
- [ ] Se puede navegar la interfaz con Tab en un orden lógico
- [ ] El elemento enfocado se ve
- [ ] Escape cierra cualquier menú o panel abierto
- [ ] Los atajos no chocan con los del navegador
- [ ] Un lector de pantalla puede recorrer la página

## UX-03 · Debe funcionar en pantalla angosta

- [ ] El árbol lateral se convierte en un menú desplegable
- [ ] Se puede escribir cómodamente en móvil
- [ ] Las tablas, colecciones y diagramas se desplazan sin romper el ancho de la página
- [ ] Los botones son lo bastante grandes para el dedo
- [ ] Ningún diálogo queda cortado fuera de pantalla

## UX-04 · Debe explicar qué hacer cuando no hay nada

- [ ] Un espacio sin páginas explica cómo crear la primera
- [ ] Una colección sin filas explica cómo agregar una
- [ ] Una búsqueda sin resultados sugiere qué probar
- [ ] Una lista vacía por un filtro lo dice, en vez de parecer vacía de verdad

## UX-05 · Debe comportarse bien mientras carga y cuando falla

- [ ] Al navegar se muestra un esqueleto de carga, no una pantalla en blanco
- [ ] La carga no hace saltar el contenido cuando termina
- [ ] Un error muestra qué pasó y ofrece reintentar
- [ ] Un error en una sección no rompe la página completa
- [ ] Nunca aparece un identificador técnico crudo como mensaje de error

## UX-06 · Debe estar en español y en inglés

- [ ] Se puede cambiar el idioma
- [ ] La elección se recuerda
- [ ] No queda texto sin traducir en ninguno de los dos
- [ ] Las fechas y los números siguen el formato del idioma elegido

## UX-07 · Debe tolerar la falta de conexión

- [ ] Se puede seguir leyendo una página ya abierta sin conexión
- [ ] Se puede seguir escribiendo sin conexión
- [ ] Se indica claramente que no hay conexión
- [ ] Al volver la conexión los cambios se envían solos
- [ ] Si hubo cambios en conflicto se resuelven sin perder texto
- [ ] Recargar sin conexión no muestra una pantalla rota

## UX-08 · Debe orientar a quien llega por primera vez

- [ ] La primera vez se explica qué es un espacio y qué es una página
- [ ] Se ofrece crear la primera página con acompañamiento
- [ ] La guía se puede saltar
- [ ] No vuelve a aparecer una vez completada

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
