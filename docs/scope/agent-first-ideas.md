# Ideas para que Neuma sea primero para agentes

Ideas del 20 de octubre de 2026 para el principio «Product Principle: Agent First» de `AGENTS.md`. Ninguna está en el alcance actual. Se retoman cuando se decida, y cada una que toque el diseño lleva su ADR antes del código.

Parten de cómo trabaja un agente: su contexto es limitado, actúa en ciclos, necesita citar y no puede adivinar.

## Darle el contexto justo

- **Paquete de contexto.** Una herramienta recibe una pregunta y un presupuesto de tokens y arma el mejor contexto para responderla. Trae los bloques más relevantes con su ruta de títulos, sus enlaces, quién los escribió, si están verificados y su id para citar, sin duplicados y recortado al presupuesto. Se arma con la búsqueda y el grafo que ya existen.
- **Búsqueda híbrida.** La búsqueda por texto de hoy, más búsqueda semántica con un embedding por bloque en el mismo Postgres (pgvector), más una señal del grafo: retroenlaces, recencia y verificación. Encuentra por significado y no solo por palabras.
- **Recorrer el grafo.** Desde un bloque, sus vecinos hasta N saltos y con presupuesto: menciones, retroenlaces, relaciones, bloques sincronizados, padre e hijos.
- **Citas verificables.** Cada dato llega con su bloque y su versión, y una herramienta dice si una cita sigue vigente o cambió.

## Saber qué cambió

- **Cambios desde la última visita.** Cada agente lleva un cursor y pregunta qué cambió desde la última vez en un espacio, una página o una colección. Recibe solo los bloques cambiados, a partir del registro de transacciones que ya existe.
- **Suscripciones.** El agente se suscribe a un ámbito y recibe un aviso cuando algo cambia, sin preguntar a cada rato.
- **Leer solo si cambió.** El agente manda la versión que ya tiene, y si no cambió la respuesta es corta y no gasta contexto.

## Actuar con seguridad

- **Ensayo antes de escribir.** El agente manda sus operaciones en modo ensayo y recibe el resultado y la diferencia sin guardar nada. La transacción ya se planifica en memoria antes de guardarse, así que basta con no confirmarla.
- **Modo sugerencia.** El agente propone cambios que una persona acepta o rechaza, como el control de cambios de un documento.
- **Escribir por intención.** Operaciones ancladas al contenido («después del título X», «reemplaza el párrafo que dice Y») que resisten ediciones simultáneas, y lotes atómicos entre varias páginas.
- **El agente como actor propio.** Los agentes son miembros con identidad propia que actúan en nombre de una persona. El historial muestra «escrito por el agente X por encargo de Y», con los mismos permisos que esa persona.

## Memoria y trabajo de los agentes

- **Memoria propia del agente.** Un espacio privado por agente para notas, hallazgos y estado de su trabajo, con búsqueda y vencimiento. Lo útil se promueve a conocimiento compartido.
- **Tareas para agentes.** Una fila de colección se asigna a un agente. El agente pide sus tareas con el contexto ya armado, actualiza el estado y comenta.
- **Disparadores.** Mencionar a un agente o cambiar el estado de una fila le avisa, con el paquete de contexto listo. Las automatizaciones las ejecutan agentes.
- **Salud del conocimiento.** El agente detecta páginas vencidas, contradicciones entre páginas y verificaciones caducadas, y propone arreglos en modo sugerencia.

## Por dónde empezar cuando se retome

Las cuatro primeras cuestan poco porque se apoyan en lo que ya existe:

1. el paquete de contexto;
2. los cambios desde la última visita;
3. el ensayo antes de escribir;
4. leer solo si cambió.

Después vendrían la búsqueda semántica, el modo sugerencia y los agentes como actores propios, que necesitan ADR.
