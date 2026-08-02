// screaming-snake-in-constants
// Qué hace: obliga SCREAMING_SNAKE_CASE en constantes de dominio.
// Para qué: convención uniforme y reconocible para constantes (§7).
const SCREAMING_SNAKE = /^[A-Z][A-Z0-9_]*$/;

export const screamingSnakeInConstants = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Constants in a constants/ directory must use SCREAMING_SNAKE naming (variable name and all object keys).',
    },
    messages: {
      badName: 'Constants in `constants/` must use SCREAMING_SNAKE naming (e.g. MY_CONSTANT). Found: "{{ name }}".',
      badKey: 'Object keys inside `constants/` must use SCREAMING_SNAKE naming (e.g. KEY_NAME). Found: "{{ key }}".',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const isInConstantsDir = filename.includes('/constants/') || filename.includes('\\constants\\');
    if (!isInConstantsDir) return {};

    function checkKeys(node) {
      if (node?.type !== 'ObjectExpression') return;
      for (const prop of node.properties) {
        if (prop.type === 'Property' && prop.key.type === 'Identifier') {
          if (!SCREAMING_SNAKE.test(prop.key.name)) {
            context.report({
              node: prop,
              messageId: 'badKey',
              data: { key: prop.key.name },
            });
          }
        }
      }
    }

    return {
      VariableDeclaration(node) {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier') {
            if (!SCREAMING_SNAKE.test(decl.id.name)) {
              context.report({
                node: decl,
                messageId: 'badName',
                data: { name: decl.id.name },
              });
            }
            if (decl.init?.type === 'ObjectExpression' && !decl.id.typeAnnotation) {
              checkKeys(decl.init);
            }
          }
        }
      },
    };
  },
};
