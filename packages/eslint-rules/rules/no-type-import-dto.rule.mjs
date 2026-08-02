// no-type-import-dto
// Qué hace: prohíbe importar un DTO con `import type`.
// Para qué: NestJS necesita el DTO en runtime (validación/decoradores); `import type` lo borra.
export const noTypeImportDto = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Los DTOs (clases con decoradores de validacion) deben importarse como value imports (sin "type"). NestJS necesita la clase en runtime para ValidationPipe.',
    },
    messages: {
      foundTypeImport:
        '"{{name}}" es un DTO de clase y debe importarse como value import (sin "type"). NestJS necesita la clase en runtime para class-validator y ValidationPipe.',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const isAllTypeImport = node.importKind === 'type';

        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') continue;

          const isTypeImport = isAllTypeImport || spec.importKind === 'type';
          if (!isTypeImport) continue;
          if (!spec.local.name.endsWith('Dto')) continue;

          context.report({
            node: spec,
            messageId: 'foundTypeImport',
            data: { name: spec.local.name },
          });
        }
      },
    };
  },
};
