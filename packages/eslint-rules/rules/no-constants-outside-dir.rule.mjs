// no-constants-outside-dir
// Qué hace: prohíbe declarar constantes de dominio fuera del `constants/` dir. En `domain/` se
// permiten, pero solo en su propio archivo `*.constants.ts`. Para qué: hogar único y predecible
// para valores literales de dominio (§7).
//
// Una constante se reconoce por lo que vale, no por cómo se llama: `const dayInMilliseconds =
// 24 * 60 * 60 * 1000` es tan constante como `DAY_IN_MILLISECONDS`, y mirar solo el nombre en
// mayúsculas dejaba pasar cualquier valor fijo con escribirlo en minúscula.
const SCREAMING_SNAKE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/** Envolturas de tipo que no cambian el valor: `x as const`, `x satisfies T`, `x!`. */
const TYPE_WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression']);

const unwrap = (node) => (node && TYPE_WRAPPERS.has(node.type) ? unwrap(node.expression) : node);

/**
 * La forma de una consulta (`{ id: true } satisfies Prisma.PageSelect`) es fija,
 * pero no es un valor de dominio: describe qué columnas lee el repositorio que
 * la declara, y su lugar es junto a esa consulta.
 */
const isPrismaType = (type) =>
  type.type === 'TSArrayType'
    ? isPrismaType(type.elementType)
    : type.type === 'TSTypeReference' &&
      type.typeName.type === 'TSQualifiedName' &&
      type.typeName.left.type === 'Identifier' &&
      type.typeName.left.name === 'Prisma';

const isPrismaQueryShape = (node) => node?.type === 'TSSatisfiesExpression' && isPrismaType(node.typeAnnotation);

/** Archivos de ruta de Next.js, que leen ciertas exportaciones por su nombre. */
const NEXT_ROUTE_FILE_PATTERN = /[/\\](page|layout|template|default|loading|error|not-found|route)\.tsx?$/;

/**
 * Las exportaciones que Next.js exige declarar en el propio archivo de ruta
 * (configuración del segmento y metadatos). No se pueden mover a otro lado.
 */
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

/** Otra constante: un nombre en mayúsculas o una de sus propiedades (`LIMITS.page`). */
const isConstantReference = (node) =>
  (node.type === 'Identifier' && SCREAMING_SNAKE_PATTERN.test(node.name)) ||
  (node.type === 'MemberExpression' && !node.computed && isConstantReference(node.object));

/** `Math.random()` da otro valor en cada carga: es el único cálculo de `Math` que no es fijo. */
const isMathCall = (node) =>
  node.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  node.callee.object.type === 'Identifier' &&
  node.callee.object.name === 'Math' &&
  !(node.callee.property.type === 'Identifier' && node.callee.property.name === 'random');

/** Construcciones que, con argumentos fijos, dan un valor fijo: `new RegExp('…')`, `new Set(['a'])`. */
const STATIC_CONSTRUCTORS = new Set(['RegExp', 'Set', 'Map']);

const isStaticConstruction = (node) =>
  node.type === 'NewExpression' && node.callee.type === 'Identifier' && STATIC_CONSTRUCTORS.has(node.callee.name);

/**
 * Si una expresión es un valor fijo: se sabe al cargar el módulo y no depende
 * de nada que cambie. Literales, cálculos sobre literales u otras constantes,
 * expresiones regulares, y listas u objetos hechos solo de eso.
 */
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

/** Solo lo declarado a nivel de módulo: dentro de una función, un valor es parte de su cuerpo. */
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
