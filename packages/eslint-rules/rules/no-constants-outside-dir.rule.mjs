// no-constants-outside-dir
// Qué hace: prohíbe declarar constantes de dominio fuera del `constants/` dir. En `domain/` se
// permiten, pero solo en su propio archivo `*.constants.ts`. Para qué: hogar único y predecible
// para valores literales de dominio (§7).
const SCREAMING_SNAKE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export const noConstantsOutsideDir = {
  meta: {
    type: 'suggestion',
    docs: { description: 'SCREAMING_SNAKE constants belong in a constants/ dir (or a *.constants.ts file inside domain/)' },
    messages: {
      foundConst:
        'SCREAMING_SNAKE constants belong in a `constants/` directory (or a `*.constants.ts` file inside `domain/`). Move this constant.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const inDomain = filename.includes('/domain/') || filename.includes('\\domain\\');
    const isConstantsFile = filename.endsWith('.constants.ts') || filename.endsWith('.constants.tsx');
    const isAllowed =
      filename.includes('/constants/') ||
      filename.includes('\\constants\\') ||
      (inDomain && isConstantsFile);
    if (!isAllowed) {
      return {
        VariableDeclaration: (node) => {
          for (const decl of node.declarations) {
            if (decl.id.type === 'Identifier' && SCREAMING_SNAKE_PATTERN.test(decl.id.name)) {
              context.report({ node, messageId: 'foundConst' });
            }
          }
        },
      };
    }
    return {};
  },
};
