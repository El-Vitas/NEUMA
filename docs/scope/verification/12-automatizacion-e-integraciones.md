# 12 · Automatización e integraciones

Que el trabajo repetitivo lo haga el producto, y que el cerebro se conecte con lo que ya se usa afuera.

> Leer `README.md` de esta carpeta antes de usar este documento.

## Cómo está construido hoy

Existe **el bloque de botón**, que escribe una fila donde se le dice. Nada más:
no hay disparadores, ni recurrencia, ni recordatorios, ni integraciones, ni IA.
No hay tareas programadas de ninguna clase en el producto, que es el cimiento
que casi todo este documento necesita.

Salvo el botón, este documento describe producto por construir, no producto por
verificar.

---

## AU-01 · Debe permitir reaccionar a los cambios de una colección

- [ ] Se puede definir una acción que ocurre cuando cambia una propiedad
- [ ] Se puede definir una acción que ocurre cuando se agrega una fila
- [ ] La acción puede cambiar el valor de otra propiedad
- [ ] La acción puede avisar a una persona
- [ ] La acción puede crear una página
- [ ] Se pueden encadenar varias acciones
- [ ] Se ve la lista de automatizaciones de la colección
- [ ] Se puede desactivar una sin eliminarla
- [ ] Se ve cuándo se ejecutó por última vez
- [ ] Un fallo se informa en vez de quedar en silencio
- [ ] Una automatización no puede dispararse a sí misma en bucle

## AU-02 · Debe permitir disparar acciones a mano

- [ ] Se puede insertar un botón que ejecuta acciones
- [ ] El botón puede crear una página desde una plantilla
- [ ] El botón puede agregar una fila a una colección
- [ ] El botón puede cambiar propiedades de la página actual
- [ ] Se confirma visualmente que se ejecutó
- [ ] Se puede editar la configuración después

## AU-03 · Debe permitir tareas que se repiten

- [ ] Se puede definir que una fila se cree cada cierto tiempo
- [ ] Se puede elegir la frecuencia: diaria, semanal, mensual
- [ ] La fila creada parte de una plantilla
- [ ] Las fechas de la fila nueva se ajustan al período correspondiente
- [ ] Se puede pausar y reanudar la repetición
- [ ] Se ve cuándo se creará la próxima

## AU-04 · Debe recordar lo que tiene fecha

- [ ] Se puede poner un recordatorio sobre una fecha
- [ ] Se elige con cuánta anticipación avisa
- [ ] El aviso llega dentro de la aplicación
- [ ] El aviso puede llegar por correo
- [ ] Se puede posponer
- [ ] Se puede eliminar el recordatorio sin borrar la fecha
- [ ] Una fila con fecha vencida se distingue visualmente

---

## IT-01 · Debe mostrar bien los enlaces de las herramientas que se usan

- [ ] Pegar el enlace de un repositorio muestra una tarjeta con su información
- [ ] Pegar el enlace de un diseño muestra una vista previa
- [ ] Pegar un enlace desconocido muestra al menos título e ícono del sitio
- [ ] Una vista previa que no se puede obtener degrada a enlace simple, sin error

## IT-02 · Debe permitir que otros sistemas escriban aquí

- [ ] Existe una forma de crear páginas desde fuera del producto
- [ ] Se puede autenticar a un sistema externo sin usar la cuenta de una persona
- [ ] Ese acceso se puede revocar
- [ ] Se ve qué sistemas externos tienen acceso y qué hicieron
- [ ] Un sistema externo respeta los mismos permisos que una persona

## IT-03 · Debe permitir avisar hacia afuera

- [ ] Se puede notificar a un sistema externo cuando algo cambia
- [ ] Se elige qué eventos se envían
- [ ] Se ve el resultado de los últimos envíos
- [ ] Un envío fallido se reintenta y se informa

## IT-04 · Debe permitir capturar contenido desde el navegador

- [ ] Se puede guardar una página web como página del cerebro
- [ ] Se elige a qué espacio entra
- [ ] Se conserva el enlace de origen
- [ ] Se puede agregar una nota al guardarla

---

## IA-01 · Debe permitir preguntarle al contenido

- [ ] Se puede hacer una pregunta y responder con base en las páginas propias
- [ ] La respuesta cita las páginas de donde salió
- [ ] Solo usa contenido al que uno tiene acceso
- [ ] Dice cuándo no encontró información en vez de inventarla

## IA-02 · Debe permitir apoyarse al escribir

- [ ] Se puede pedir un resumen de la página
- [ ] Se puede pedir traducir un texto seleccionado
- [ ] Se puede pedir mejorar la redacción de una selección
- [ ] Se puede pedir continuar escribiendo desde el cursor
- [ ] Lo generado se puede aceptar, descartar o volver a pedir
- [ ] Lo generado nunca reemplaza texto sin confirmación
- [ ] Se distingue lo generado de lo escrito por una persona

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
