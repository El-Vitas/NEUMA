// constants-dir-only-constants
// Qué hace: dentro de un directorio `constants/`, solo permite constantes; reporta
//   funciones, clases, interfaces y type aliases declarados ahí.
// Para qué: mantener `constants/` como hogar exclusivo de valores literales (§1.1),
//   empujando funciones a helpers, tipos a `types/`, etc.
// Opción: { helpersDir } — carpeta de helpers sugerida en el mensaje ('lib' en el
//   frontend, 'utils' en el backend). Default: 'lib'.

const DEFAULT_HELPERS_DIR = 'lib';

export const constantsDirOnlyConstants = {
  meta: {
    type: 'suggestion',
    docs: { description: 'only SCREAMING_SNAKE const declarations are allowed in constants/ directory' },
    messages: {
      foundFunction: 'Functions do not belong in `constants/`. Move it to `{{helpersDir}}/`.',
      foundClass: 'Classes do not belong in `constants/`. Move it to its own module.',
      foundInterface: 'Interfaces do not belong in `constants/`. Move it to `types/`.',
      foundTypeAlias: 'Type aliases do not belong in `constants/`. Move it to `types/`.',
    },
    schema: [
      {
        type: 'object',
        properties: { helpersDir: { type: 'string' } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/constants/') && !filename.includes('\\constants\\')) return {};

    const helpersDir = context.options[0]?.helpersDir ?? DEFAULT_HELPERS_DIR;

    return {
      FunctionDeclaration(node) {
        context.report({ node, messageId: 'foundFunction', data: { helpersDir } });
      },
      ClassDeclaration(node) {
        context.report({ node, messageId: 'foundClass' });
      },
      TSInterfaceDeclaration(node) {
        context.report({ node, messageId: 'foundInterface' });
      },
      TSTypeAliasDeclaration(node) {
        context.report({ node, messageId: 'foundTypeAlias' });
      },
    };
  },
};
