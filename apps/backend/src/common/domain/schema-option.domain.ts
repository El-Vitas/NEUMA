import type { PagePropertyOption } from '@company-brain/shared';
import { pagePropertyRequiresOptions, Result } from '@company-brain/shared';
import type {
  SchemaOptionRename,
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
} from './schema.domain.types';
import { SchemaPropertyDefinitionError } from './schema.error';
import { isStringArray } from './schema-property.domain';

const refuse = (details: string) =>
  Result.fail<never, SchemaPropertyDefinitionError>(new SchemaPropertyDefinitionError(details));

const withRewrittenOption = (
  property: SchemaPropertyDefinition,
  rename: SchemaOptionRename,
): SchemaPropertyDefinition => {
  const options = property.options ?? [];
  const { to } = rename;
  if (to === null) return { ...property, options: options.filter((option) => option.value !== rename.from) };
  return {
    ...property,
    options: options.map((option) => (option.value === rename.from ? { ...option, value: to } : option)),
  };
};

const findOptionsToRewrite = (
  properties: readonly SchemaPropertyDefinition[],
  rename: SchemaOptionRename,
): SchemaPropertyDefinitionError | readonly PagePropertyOption[] => {
  const property = properties.find((candidate) => candidate.key === rename.propertyKey);
  if (property === undefined) return new SchemaPropertyDefinitionError(`Unknown property ${rename.propertyKey}`);
  if (!pagePropertyRequiresOptions(property.type)) {
    return new SchemaPropertyDefinitionError(`${rename.propertyKey} has no options`);
  }
  const options = property.options ?? [];
  return options.some((option) => option.value === rename.from)
    ? options
    : new SchemaPropertyDefinitionError(`Unknown option ${rename.from}`);
};

const whatIsWrongWithTheName = (options: readonly PagePropertyOption[], rename: SchemaOptionRename): null | string => {
  if (rename.to === null) return null;
  if (rename.to.trim().length === 0) return 'An option needs a name';
  return options.some((option) => option.value === rename.to && option.value !== rename.from)
    ? `Option ${rename.to} already exists`
    : null;
};

/**
 * Cómo queda la forma cuando a una opción se le cambia el nombre, o se la quita.
 *
 * Renombrar es cambiarle el nombre a una columna del tablero, y se hace en su
 * sitio y con su color puesto: una columna que al renombrarla se fuera al final
 * o se destiñera no sería la misma columna. El nombre nuevo no puede ser el de
 * otra opción, porque entonces dos columnas responderían a lo mismo y nadie
 * sabría a cuál pertenece cada fila. Quitarla —`to` en nada— borra la columna,
 * no lo que había dentro.
 *
 * Esto solo dice cómo queda la forma. Lo que las filas guardaron bajo el nombre
 * viejo se reescribe en el mismo movimiento, porque una forma que ya no reconoce
 * lo que sus filas dicen las deja a todas sin columna.
 */
export const rewriteSchemaOption = (
  properties: readonly SchemaPropertyDefinition[],
  rename: SchemaOptionRename,
): Result<readonly SchemaPropertyDefinition[], SchemaPropertyDefinitionError> => {
  const options = findOptionsToRewrite(properties, rename);
  if (options instanceof SchemaPropertyDefinitionError) return Result.fail(options);
  const wrongName = whatIsWrongWithTheName(options, rename);
  if (wrongName !== null) return refuse(wrongName);
  return Result.ok(
    properties.map((candidate) =>
      candidate.key === rename.propertyKey ? withRewrittenOption(candidate, rename) : candidate,
    ),
  );
};

/** Si esta fila dice el nombre en cuestión, y por tanto hay que reescribirla. */
export const propertyValueMentions = (value: SchemaPropertyValue | undefined, name: string): boolean =>
  isStringArray(value) ? value.includes(name) : value === name;

/**
 * Lo que una fila pasa a responder: el nombre nuevo donde decía el viejo.
 *
 * Cuando no hay nombre nuevo, la fila deja de responder eso y nada más: quitar
 * una columna quita la columna, no las filas que estaban en ella.
 */
export const rewritePropertyValue = (
  value: SchemaPropertyValue | undefined,
  from: string,
  to: null | string,
): SchemaPropertyValue | undefined => {
  if (isStringArray(value)) {
    return to === null ? value.filter((entry) => entry !== from) : value.map((entry) => (entry === from ? to : entry));
  }
  if (value !== from) return value;
  return to ?? undefined;
};

/**
 * Todo lo que una fila guarda, con esa propiedad reescrita y el resto intacto.
 *
 * Una propiedad que se queda sin respuesta se quita en vez de guardarse vacía:
 * presente pero vacía no es lo mismo que ausente, y es ausente lo que significa
 * que la fila ya no está en ninguna columna.
 */
export const rewritePropertyValues = (
  stored: SchemaPropertyValues,
  propertyKey: string,
  from: string,
  to: null | string,
): SchemaPropertyValues => {
  const { [propertyKey]: replaced, ...rest } = stored;
  const written = rewritePropertyValue(replaced, from, to);
  return written === undefined ? rest : { ...rest, [propertyKey]: written };
};
