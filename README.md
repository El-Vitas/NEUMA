# Neuma

Neuma es la base de conocimiento interna de una organización: espacios con páginas que se editan en vivo entre varias personas, colecciones con vistas, búsqueda de texto completo y retroenlaces. Los agentes de IA trabajan en ella como una persona más, a través de un servidor MCP con los mismos permisos que la aplicación.

Cada despliegue atiende a una sola organización, y solo entran las personas a las que un administrador les crea una cuenta.

## Qué hace

- **Páginas y espacios.** Jerarquía de páginas con historial de versiones, papelera, favoritas, íconos y exportación. Los espacios pueden ser internos, restringidos o privados.
- **Editor en vivo.** Editor ProseMirror sobre Yjs y Hocuspocus, con diagramas Mermaid, fórmulas, tablas, adjuntos y menciones entre páginas.
- **Colecciones.** Una página puede llevar un esquema de propiedades, y sus páginas hijas se ven como tabla, tablero, lista, galería o calendario.
- **Búsqueda y retroenlaces.** Búsqueda de texto completo en PostgreSQL por página y por bloque, y la sección «Vinculado desde». Las dos se proyectan desde un outbox en procesos aparte.
- **Agentes.** Servidor MCP en `/api/v1/mcp` con tokens de acceso de alcance limitado. Cada acción de un agente queda auditada.

## Estructura

| Workspace | Qué es | Puerto |
|---|---|---|
| `apps/backend` | API NestJS 11 sobre Fastify y Bun, el servidor MCP, la colaboración en vivo y los workers de búsqueda y retroenlaces | 3000 |
| `apps/portal` | Next.js 16 (App Router), React 19 y Tailwind 4 | 3010 |
| `packages/db` | Contrato de Prisma ORM 8, migraciones y seed para PostgreSQL 18 | — |
| `packages/shared` | Tipos, esquemas y lógica compartida entre backend y portal | — |
| `packages/design` | Tokens de diseño en modo claro y oscuro | — |
| `packages/eslint-rules` | Reglas de ESLint que hacen cumplir la arquitectura del repo | — |
| `packages/rules-cli` | CLI del registro de reglas de negocio en `docs/business-rules/` | — |

## Desarrollo local

Requiere Bun 1.4 y Docker o Podman para PostgreSQL.

```bash
bun install
cp .env.example .env
docker compose up -d postgres
cd packages/db && bun run db:migrate:deploy && bun run db:seed && cd ../..
bun run dev
```

`bun run dev` levanta el backend y el portal. La búsqueda y los retroenlaces necesitan además sus workers, cada uno en su terminal:

```bash
cd apps/backend && bun run search:worker
cd apps/backend && bun run links:worker
```

El seed crea tres usuarios, `admin@example.com`, `worker@example.com` y `client@example.com`, con la contraseña definida en `packages/db/prisma/seed/users.seed.ts`.

## Comandos

```bash
bun run dev          # backend y portal en modo watch
bun run check        # formato, lint y tipos de todo el monorepo
bun run check:ramless  # lo mismo, de a una tarea, para máquinas con poca memoria
bun run test:ramless  # pruebas de todos los workspaces
bun run rules:query  # consultar las reglas de negocio
```

## Despliegue

`docker-compose.yml` levanta PostgreSQL, las migraciones (una vez), el backend, los dos workers y el portal. `deploy/podman/` trae las mismas piezas como unidades Quadlet de systemd, y su README explica el despliegue en una VM.

No hay registro abierto. En una instalación nueva, el primer administrador se crea una sola vez desde el servidor, y después los administradores crean las cuentas desde «Usuarios»:

```bash
read -rs CLAVE && printf '%s' "$CLAVE" | docker compose exec -T backend \
  bun run admin:create --email tu@empresa.cl --name "Tu Nombre"; unset CLAVE
```

## Documentación

- `AGENTS.md`, en la raíz y en cada app: las convenciones de ingeniería, para personas y agentes.
- `docs/architecture/adr/`: las decisiones de arquitectura y por qué se tomaron.
- `docs/business-rules/`: las reglas de negocio, versionadas y consultables con `bun run rules:query`.
- `docs/scope/`: el alcance actual y lo que queda fuera.
