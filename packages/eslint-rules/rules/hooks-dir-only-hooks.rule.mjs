// hooks-dir-only-hooks
// Qué hace: dentro de `hooks/`, solo permite hooks `use*`.
// Para qué: que `hooks/` sea hogar exclusivo de hooks (§1.1), sin tipos ni helpers sueltos.
const STARTS_WITH_USE = /^use[A-Z]/;

export const hooksDirOnlyHooks = {
  meta: {
    type: 'suggestion',
    docs: { description: 'only custom hooks (use*) are allowed in hooks/ directory' },
    messages: {
      foundNonHook: 'Only custom hooks (`use*`) are allowed in `hooks/`. Move this to its proper directory.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/hooks/') && !filename.includes('\\hooks\\')) return {};

    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;

        if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier' && !STARTS_WITH_USE.test(d.id.name)) {
              context.report({ node, messageId: 'foundNonHook' });
              return;
            }
          }
        }

        if (decl.type === 'FunctionDeclaration' && decl.id && !STARTS_WITH_USE.test(decl.id.name)) {
          context.report({ node, messageId: 'foundNonHook' });
        }
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration.type === 'FunctionDeclaration') {
          const id = node.declaration.id;
          if (id && !STARTS_WITH_USE.test(id.name)) {
            context.report({ node, messageId: 'foundNonHook' });
          }
        }
      },
    };
  },
};
