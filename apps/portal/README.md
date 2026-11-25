# Portal

Neuma's web application: Next.js 16 with App Router, React 19 and Tailwind 4. It runs on port 3010 and talks to the backend over HTTP and over the live channel.

## Commands

```bash
bun run dev        # development server at http://localhost:3010
bun run build      # builds for production
bun run check      # dependencies, format, lint and types
bun run test       # unit tests with bun test
```

## Structure

- `app/`: App Router routes, by language.
- `modules/`: each area of the product (pages, editor, collections, search, users) with its components, hooks, types and logic.
- `shared/`: what several modules use.
- `messages/`: the interface texts in Spanish and English.
- `content/docs/`: the user manual shown inside the portal.
- `tests/`: the tests, with the same structure as the code.

The conventions are in `AGENTS.md` and the visual system in `DESIGN.md`.
