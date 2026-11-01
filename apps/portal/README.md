# Portal

La aplicación web de Neuma: Next.js 16 con App Router, React 19 y Tailwind 4. Corre en el puerto 3010 y habla con el backend por HTTP y por el canal en vivo.

## Comandos

```bash
bun run dev        # servidor de desarrollo en http://localhost:3010
bun run build      # compila para producción
bun run check      # dependencias, formato, lint y tipos
bun run test       # pruebas unitarias con bun test
```

## Estructura

- `app/`: rutas del App Router, por idioma.
- `modules/`: cada área del producto (páginas, editor, colecciones, búsqueda, usuarios) con sus componentes, hooks, tipos y lógica.
- `shared/`: lo que usan varios módulos.
- `messages/`: los textos de la interfaz en español e inglés.
- `content/docs/`: el manual de uso que se muestra dentro del portal.
- `tests/`: las pruebas, con la misma estructura que el código.

Las convenciones están en `AGENTS.md` y el sistema visual en `DESIGN.md`.
