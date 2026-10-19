// dependency-cruiser reads TypeScript only up to 6, but Bun's shared store hands it TypeScript 7 (ADR 005), and
// without a compiler it misses `import type` and reports false orphans. This points its `typescript` imports at
// the project's TypeScript 6. Delete it once dependency-cruiser supports TypeScript 7.
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const resolveFromProject = createRequire(import.meta.url).resolve;
const isTypescript = (specifier) => specifier === "typescript" || specifier === "typescript/package.json";
const isFromDependencyCruiser = (parentURL) => parentURL?.includes("/dependency-cruiser/") ?? false;

registerHooks({
  resolve: (specifier, context, nextResolve) => {
    if (!isTypescript(specifier) || !isFromDependencyCruiser(context.parentURL)) {
      return nextResolve(specifier, context);
    }
    return { url: pathToFileURL(resolveFromProject(specifier)).href, shortCircuit: true };
  },
});
