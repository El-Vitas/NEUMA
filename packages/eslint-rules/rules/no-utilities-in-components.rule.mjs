// no-utilities-in-components
// Qué hace: prohíbe helpers que no renderizan dentro de archivos de componente.
// Para qué: el componente solo renderiza; la lógica va a `lib/` (§1.1, §14.30).
const STARTS_WITH_UPPERCASE = /^[A-Z]/;

const isModuleScope = (node, context) => {
  const ancestors = context.sourceCode.getAncestors ? context.sourceCode.getAncestors(node) : [];
  const parent = ancestors[ancestors.length - 1];
  return parent !== undefined && parent.type === 'Program';
};

const isPropsType = (name) => name.endsWith('Props');

export const noUtilitiesInComponents = {
  meta: {
    type: 'suggestion',
    docs: { description: 'only components and their props are allowed in components/ directory' },
    messages: {
      nonExport:
        'Non-exported module-level constants do not belong in `components/`. Move it to `lib/` or make it a component.',
      nonExportFn:
        'Non-exported module-level functions do not belong in `components/`. Move it to `lib/` or make it a component.',
      nonExportIface:
        'Non-exported interfaces do not belong in `components/`. Move it to `types/`. (Exception: IProps/Props)',
      nonExportTAlias:
        'Non-exported type aliases do not belong in `components/`. Move it to `types/`. (Exception: Props)',
      nonExportClass: 'Non-exported classes do not belong in `components/`. Move it to its proper directory.',
      notComponent:
        'Only components (uppercase exports) are allowed in `components/`. Move this to `hooks/` or `lib/`.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/components/') && !filename.includes('\\components\\')) return {};
    return {
      VariableDeclaration(node) {
        if (!isModuleScope(node, context)) return;
        context.report({ node, messageId: 'nonExport' });
      },
      FunctionDeclaration(node) {
        if (!isModuleScope(node, context)) return;
        context.report({ node, messageId: 'nonExportFn' });
      },
      ClassDeclaration(node) {
        if (!isModuleScope(node, context)) return;
        context.report({ node, messageId: 'nonExportClass' });
      },
      TSInterfaceDeclaration(node) {
        if (!isModuleScope(node, context)) return;
        if (isPropsType(node.id.name)) return;
        context.report({ node, messageId: 'nonExportIface' });
      },
      TSTypeAliasDeclaration(node) {
        if (!isModuleScope(node, context)) return;
        if (isPropsType(node.id.name)) return;
        context.report({ node, messageId: 'nonExportTAlias' });
      },
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;

        if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier' && !STARTS_WITH_UPPERCASE.test(d.id.name)) {
              context.report({ node, messageId: 'notComponent' });
              return;
            }
          }
        }

        if (decl.type === 'FunctionDeclaration' && decl.id && !STARTS_WITH_UPPERCASE.test(decl.id.name)) {
          context.report({ node, messageId: 'notComponent' });
        }
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration.type === 'FunctionDeclaration') {
          const id = node.declaration.id;
          if (id && !STARTS_WITH_UPPERCASE.test(id.name)) {
            context.report({ node, messageId: 'notComponent' });
          }
        }
      },
    };
  },
};
