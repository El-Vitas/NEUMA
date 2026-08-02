# next-template

Plantilla Next.js (App Router) con patrones y utilidades listas para usar.

Incluye:

- shadcn/ui components
- lucide-react icons
- Tailwind CSS utilities y tokens (definidos en `globals.css`)
- Testing preconfigurado con Jest + React Testing Library
- Sistema de `AGENTS` / `SKILL.md` bajo `.agents/skills`

Esta plantilla está pensada para arrancar proyectos modernos con React 19 / Next.js 16 (App Router).

## Comandos útiles

- `npm install` — instala dependencias
- `npm run dev` — servidor de desarrollo
- `npm run build` — compila para producción
- `npm run start` — inicia la app compilada
- `npm run test` — ejecuta los tests (Jest)

## Testing y estructura

Los tests pueden colocarse en una carpeta `tests/` que refleje la estructura de `app/` (por ejemplo `tests/app/page.test.tsx`) o bien colocarse co-localizados junto a los componentes. La configuración de Jest acepta ambos patrones.

Ejemplo rápido para ejecutar tests:

```bash
cd next-template
npm install
npm run test
```

## Testing y estructura

Los tests pueden colocarse en una carpeta `tests/` que refleje la estructura de `app/` (por ejemplo `tests/app/page.test.tsx`) o colocarse co-localizados junto a los componentes. La configuración de Jest acepta ambos patrones.
