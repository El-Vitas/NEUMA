// A constant is recognized by its value, not its name: matching only SCREAMING_SNAKE names
// let any fixed value through by writing it in lowercase.
const SCREAMING_SNAKE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const TYPE_WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression']);

const unwrap = (node) => (node && TYPE_WRAPPERS.has(node.type) ? unwrap(node.expression) : node);

/** A query shape (`{ id: true } satisfies Prisma.PageSelect`) is fixed but not a domain value; keep it by its query. */
const isPrismaType = (type) =>
  type.type === 'TSArrayType'
    ? isPrismaType(type.elementType)
    : type.type === 'TSTypeReference' &&
      type.typeName.type === 'TSQualifiedName' &&
      type.typeName.left.type === 'Identifier' &&
      type.typeName.left.name === 'Prisma';

const isPrismaQueryShape = (node) => node?.type === 'TSSatisfiesExpression' && isPrismaType(node.typeAnnotation);

const NEXT_ROUTE_FILE_PATTERN = /[/\\](page|layout|template|default|loading|error|not-found|route)\.tsx?$/;

/** Exports Next.js requires in the route file itself; they cannot move elsewhere. */
const NEXT_ROUTE_EXPORTS = new Set([
  'metadata',
  'viewport',
  'instant',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'runtime',
  'preferredRegion',
  'maxDuration',
]);

const isNextRouteExport = (node, name, filename) =>
  node.parent?.type === 'ExportNamedDeclaration' &&
  NEXT_ROUTE_FILE_PATTERN.test(filename) &&
  NEXT_ROUTE_EXPORTS.has(name);

const isConstantReference = (node) =>
  (node.type === 'Identifier' && SCREAMING_SNAKE_PATTERN.test(node.name)) ||
  (node.type === 'MemberExpression' && !node.computed && isConstantReference(node.object));

/** `Math.random()` is the only `Math` call whose value is not fixed. */
const isMathCall = (node) =>
  node.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  node.callee.object.type === 'Identifier' &&
  node.callee.object.name === 'Math' &&
  !(node.callee.property.type === 'Identifier' && node.callee.property.name === 'random');

const STATIC_CONSTRUCTORS = new Set(['RegExp', 'Set', 'Map']);

const isStaticConstruction = (node) =>
  node.type === 'NewExpression' && node.callee.type === 'Identifier' && STATIC_CONSTRUCTORS.has(node.callee.name);

const isStaticValue = (rawNode) => {
  const node = unwrap(rawNode);
  if (node === null || node === undefined) return false;
  switch (node.type) {
    case 'Literal':
      return true;
    case 'TemplateLiteral':
      return node.expressions.every(isStaticValue);
    case 'UnaryExpression':
      return isStaticValue(node.argument);
    case 'BinaryExpression':
    case 'LogicalExpression':
      return isStaticValue(node.left) && isStaticValue(node.right);
    case 'ArrayExpression':
      return node.elements.length > 0 && node.elements.every((element) => element !== null && isStaticValue(element));
    case 'ObjectExpression':
      return (
        node.properties.length > 0 &&
        node.properties.every((property) => property.type === 'Property' && isStaticValue(property.value))
      );
    case 'CallExpression':
      return isMathCall(node) && node.arguments.every(isStaticValue);
    case 'NewExpression':
      return isStaticConstruction(node) && node.arguments.length > 0 && node.arguments.every(isStaticValue);
    default:
      return isConstantReference(node);
  }
};

const isModuleLevel = (node) =>
  node.parent?.type === 'Program' ||
  (node.parent?.type === 'ExportNamedDeclaration' && node.parent.parent?.type === 'Program');

export const noConstantsOutsideDir = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Module-level constants belong in a constants/ dir (or a *.constants.ts file inside domain/), whatever their name',
    },
    messages: {
      foundConst:
        'Constants belong in a `constants/` directory (or a `*.constants.ts` file inside `domain/`), named in SCREAMING_SNAKE. Move this constant — renaming it does not make it any less of one.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const inDomain = filename.includes('/domain/') || filename.includes('\\domain\\');
    const isConstantsFile = filename.endsWith('.constants.ts') || filename.endsWith('.constants.tsx');
    const isAllowed =
      filename.includes('/constants/') || filename.includes('\\constants\\') || (inDomain && isConstantsFile);
    if (isAllowed) return {};

    return {
      VariableDeclaration: (node) => {
        for (const declaration of node.declarations) {
          if (declaration.id.type !== 'Identifier') continue;
          if (isPrismaQueryShape(declaration.init) || isNextRouteExport(node, declaration.id.name, filename)) continue;
          const isNamedAsConstant = SCREAMING_SNAKE_PATTERN.test(declaration.id.name);
          const isConstantValue = node.kind === 'const' && isModuleLevel(node) && isStaticValue(declaration.init);
          if (isNamedAsConstant || isConstantValue) context.report({ node, messageId: 'foundConst' });
        }
      },
    };
  },
};
