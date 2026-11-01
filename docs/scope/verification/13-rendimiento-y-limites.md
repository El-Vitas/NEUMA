# 13 · Rendimiento y límites

Que sea potente sin exigir una máquina grande. Todo lo de aquí se comprueba usando el producto, no leyendo métricas.

> Leer `README.md` de esta carpeta antes de usar este documento.

## Cómo está construido hoy

Este documento no se poda: se corre. No hay nada aquí que dependa de construir
producto nuevo — todo se mide sobre lo que ya existe, y por eso se puede empezar
cuando se quiera.

Hay una medición previa que sirve de referencia: un árbol de 600 páginas
desplegadas dio 145 fps de media con un peor cuadro de 9 ms (`04-paginas-y-navegacion.md`,
bitácora del 2026-08-19). El resto está sin medir.

Para probar esto hace falta contenido de volumen: una colección con miles de filas y una página larga. Sembrar esos datos es parte de la verificación.

---

## RE-01 · Debe abrir una colección grande sin cargarla entera

**Cómo probarlo:** abre una colección con 5 000 filas.

- [ ] La vista aparece en menos de dos segundos
- [ ] No se piden al servidor todas las filas de una vez
- [ ] Se cargan primero las filas visibles y el resto al desplazarse
- [ ] Desplazarse rápido no deja la tabla en blanco
- [ ] La memoria del navegador no crece sin parar al recorrerla entera
- [ ] Volver atrás y entrar de nuevo no vuelve a cargar todo desde cero

## RE-02 · Debe desplazar una tabla larga con fluidez

- [ ] Desplazarse por miles de filas se siente continuo, sin saltos
- [ ] Solo se dibujan las filas visibles
- [ ] Las columnas fijas siguen en su lugar al desplazarse
- [ ] La altura de la barra de desplazamiento refleja el total real
- [ ] Funciona igual con muchas columnas

## RE-03 · Debe filtrar y ordenar sin trabar la interfaz

- [ ] Aplicar un filtro sobre miles de filas responde de inmediato
- [ ] Ordenar por una columna responde de inmediato
- [ ] El trabajo no ocurre en el navegador cargando todo primero
- [ ] Mientras calcula, la interfaz sigue respondiendo
- [ ] Agregar una fila no vuelve a ordenar toda la colección desde cero
- [ ] Cambiar una celda no vuelve a evaluar el filtro de todas las filas
- [ ] Un filtro mal formado deja pasar las filas en vez de dejar la tabla en blanco

## RE-04 · Debe abrir una fila sin cargar sus vecinas

- [ ] Abrir una fila carga solo esa fila
- [ ] Cerrarla libera lo que cargó
- [ ] Abrir muchas filas seguidas no acumula memoria indefinidamente

## RE-05 · Debe editar una página larga sin degradarse

**Cómo probarlo:** abre una página con varios cientos de bloques y escribe al final.

- [ ] Escribir se siente igual de rápido al inicio y al final de la página
- [ ] Escribir una tecla no vuelve a dibujar la página completa
- [ ] Las imágenes fuera de pantalla no se cargan hasta acercarse
- [ ] Deshacer sigue siendo instantáneo después de mucho trabajo
- [ ] Tener la página abierta una hora no aumenta el consumo de memoria

## RE-06 · Debe mantenerse liviano con varias personas conectadas

- [ ] Con cinco personas en la misma página, escribir sigue fluido
- [ ] Una persona inactiva no consume recursos como una activa
- [ ] Al cerrar la pestaña se liberan los recursos del servidor
- [ ] Una página abierta mucho tiempo no acumula historial sin límite

## RE-07 · Debe cargar la aplicación rápido

- [ ] La primera carga muestra algo útil pronto, no una pantalla en blanco
- [ ] Navegar entre páginas no recarga la aplicación completa
- [ ] El árbol lateral con cientos de páginas no retrasa la carga
- [ ] Las partes pesadas se cargan solo cuando se usan

## RE-08 · Debe consumir poco en reposo

- [ ] Con la aplicación abierta y sin tocarla, el uso de procesador es casi nulo
- [ ] No hay peticiones repetidas al servidor sin motivo
- [ ] Los procesos de fondo no consumen mientras no hay trabajo
- [ ] Levantar el entorno de desarrollo completo cabe holgado en la máquina

## RE-09 · Debe avisar sus límites en vez de romperse

- [ ] Hay un límite conocido de bloques por página, y al acercarse se avisa
- [ ] Hay un límite de tamaño por archivo, informado antes de subir
- [ ] Superar un límite da un mensaje claro, no un error genérico
- [ ] Un documento cerca del límite sigue siendo editable
- [ ] Pegar contenido enorme se rechaza o se recorta avisando, sin congelar el editor

## RE-10 · Debe tolerar contenido que no entiende

- [ ] Un bloque de un tipo desconocido no rompe la página
- [ ] Ese bloque se muestra como marcador de posición y se conserva al guardar
- [ ] El contenido guardado indica con qué versión se escribió
- [ ] Un documento de una versión anterior se abre y se actualiza solo
- [ ] Una actualización de formato no obliga a migrar todo de una vez

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
