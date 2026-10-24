import { DatabasePropertyType } from '@neuma/db';
import type {
  PageComputedConfig,
  PageFormulaDefinition,
  PageFormulaNode,
  PageFormulaPropertyInfo,
  PageFormulaSaveError,
  PageRollupCalculation,
  PageRollupDefinition,
} from '@neuma/shared';
import {
  findPageReferenceCycle,
  isPageComputedPropertyType,
  listPageFormulaReferences,
  listPageRollupCalculationsFor,
  PAGE_FORMULA_SAVE_ERROR,
  PAGE_ROLLUP_MAX_DEPTH,
  parsePageFormula,
  parsePageFormulaTree,
  Result,
  readPageRollupResultType,
  readPageRollupTargetType,
  renamePageFormulaProperties,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import { PageSchemaDefinitionError } from './page.error';
import { PROPERTY_IN_USE, ROLLUP_ERROR } from './page-computed-schema.domain.constants';
import type {
  ComputedPlanInput,
  ComputedSource,
  Edge,
  PlanResult,
  Resolution,
  RollupDraft,
} from './page-computed-schema.domain.types';
import type { ComputedDraft, RollupDependent, SchemaPropertyDraft } from './page-schema.domain.types';

const refuse = (code: string, message: string, extra: Readonly<Record<string, unknown>> = {}) =>
  Result.fail<never, PageSchemaDefinitionError>(new PageSchemaDefinitionError({ code, message, ...extra }));

const refuseSaveError = (property: SchemaPropertyDefinition, error: PageFormulaSaveError) =>
  refuse(error.code, error.message, {
    from: error.from,
    propertyKey: property.key,
    suggestions: error.suggestions,
    to: error.to,
  });

const toNodeId = (collectionId: string, key: string): string => `${collectionId}:${key}`;

const readResultType = (property: SchemaPropertyDefinition): PageFormulaPropertyInfo['resultType'] =>
  property.computed?.formula?.resultType ?? property.computed?.rollup?.resultType ?? null;

const toInfo = (
  property: SchemaPropertyDefinition,
  resolved: ReadonlyMap<string, PageFormulaPropertyInfo['resultType']>,
): PageFormulaPropertyInfo => ({
  key: property.key,
  label: property.label,
  options: property.options,
  resultType: isPageComputedPropertyType(property.type) ? (resolved.get(property.key) ?? null) : null,
  type: property.type,
});

const isStoredFormulaUnchanged = (draft: ComputedDraft | null | undefined, stored: PageFormulaDefinition | null) =>
  stored !== null && (draft?.formula === null || draft?.formula === undefined || draft.formula === stored.source);

const findRenames = (
  definitions: readonly SchemaPropertyDefinition[],
  stored: readonly SchemaPropertyDefinition[],
): ReadonlyMap<string, string> =>
  new Map(
    definitions.flatMap((property) => {
      const before = stored.find((candidate) => candidate.key === property.key);
      return before === undefined || before.label === property.label ? [] : [[property.key, property.label] as const];
    }),
  );

const readStoredComputed = (input: ComputedPlanInput, key: string): PageComputedConfig | undefined =>
  input.stored.find((property) => property.key === key)?.computed;

const toRollupDraft = (rollup: PageRollupDefinition): RollupDraft => ({
  calculation: rollup.calculation,
  relationPropertyKey: rollup.relationPropertyKey,
  targetPropertyKey: rollup.targetPropertyKey,
});

const findByReference = (
  properties: readonly SchemaPropertyDefinition[] | undefined,
  reference: string,
): SchemaPropertyDefinition | undefined => {
  const folded = reference.trim().toLowerCase();
  return (
    properties?.find((candidate) => candidate.key === reference) ??
    properties?.find((candidate) => candidate.label.trim().toLowerCase() === folded)
  );
};

/** A caller may name the relation and the property it reads by label; the rollup stores their keys. */
const withKeysFor = (input: ComputedPlanInput, draft: RollupDraft): RollupDraft => {
  const relation = findByReference(
    input.definitions.filter((candidate) => candidate.type === DatabasePropertyType.RELATION),
    draft.relationPropertyKey,
  );
  const targetId = relation?.config.targetCollectionId;
  const schema = targetId === input.collectionId ? input.definitions : input.collections.get(targetId ?? '');
  const target = findByReference(schema, draft.targetPropertyKey);
  return {
    ...draft,
    relationPropertyKey: relation?.key ?? draft.relationPropertyKey,
    targetPropertyKey: target?.key ?? draft.targetPropertyKey,
  };
};

const readSource = (input: ComputedPlanInput, property: SchemaPropertyDefinition): ComputedSource => {
  const draft = input.drafts.find((candidate) => candidate.key === property.key)?.computedDraft;
  const stored = readStoredComputed(input, property.key);
  if (property.type === DatabasePropertyType.ROLLUP) {
    const keptRollup = stored?.rollup ?? null;
    const asked = draft?.rollup ?? (keptRollup === null ? null : toRollupDraft(keptRollup));
    return { formula: null, property, rollup: asked === null ? null : withKeysFor(input, asked) };
  }
  const storedFormula = stored?.formula ?? null;
  if (storedFormula !== null && isStoredFormulaUnchanged(draft, storedFormula)) {
    const renames = findRenames(input.definitions, input.stored);
    return { formula: renamePageFormulaProperties(storedFormula, renames), property, rollup: null };
  }
  return { formula: draft?.formula ?? null, property, rollup: null };
};

const findRelationTarget = (input: ComputedPlanInput, rollup: RollupDraft): string | null => {
  const relation = input.definitions.find(
    (property) => property.key === rollup.relationPropertyKey && property.type === DatabasePropertyType.RELATION,
  );
  return relation?.config.targetCollectionId ?? null;
};

const toOwnEdge = (
  input: ComputedPlanInput,
  source: ComputedSource,
  tree: PageFormulaNode | null,
): Result<Edge, PageSchemaDefinitionError> => {
  const from = toNodeId(input.collectionId, source.property.key);
  if (tree !== null) {
    return Result.ok({ from, to: listPageFormulaReferences(tree).map((key) => toNodeId(input.collectionId, key)) });
  }
  if (source.rollup === null)
    return refuse(ROLLUP_ERROR.missing, 'A rollup property needs a rollup', { propertyKey: source.property.key });
  const targetId = findRelationTarget(input, source.rollup);
  if (targetId === null || !input.collections.has(targetId)) {
    return refuse(
      ROLLUP_ERROR.relationUnknown,
      `${source.rollup.relationPropertyKey} is not a relation to a collection that can be read`,
      { propertyKey: source.property.key },
    );
  }
  return Result.ok({
    from,
    to: [
      toNodeId(input.collectionId, source.rollup.relationPropertyKey),
      toNodeId(targetId, source.rollup.targetPropertyKey),
    ],
  });
};

const toForeignEdges = (collectionId: string, properties: readonly SchemaPropertyDefinition[]): readonly Edge[] =>
  properties.flatMap((property): readonly Edge[] => {
    const from = toNodeId(collectionId, property.key);
    const formula = property.computed?.formula;
    if (formula !== null && formula !== undefined) {
      return [{ from, to: listPageFormulaReferences(formula.ast).map((key) => toNodeId(collectionId, key)) }];
    }
    const rollup = property.computed?.rollup;
    if (rollup === null || rollup === undefined) return [];
    return [
      {
        from,
        to: [
          toNodeId(collectionId, rollup.relationPropertyKey),
          toNodeId(rollup.targetCollectionId, rollup.targetPropertyKey),
        ],
      },
    ];
  });

/** A formula that read a property which is gone: the property is in use, and naming the formula says where. */
const explainUnknownProperty = (input: ComputedPlanInput, source: ComputedSource, error: PageFormulaSaveError) => {
  const wasThere = input.stored.some((property) => error.message.includes(`"${property.label}"`));
  return wasThere
    ? refuse(PROPERTY_IN_USE, `${error.message}, and ${source.property.label} reads it`, {
        dependents: [source.property.label],
        propertyKey: source.property.key,
      })
    : refuseSaveError(source.property, error);
};

const parseTrees = (
  input: ComputedPlanInput,
  sources: readonly ComputedSource[],
): Result<ReadonlyMap<string, PageFormulaNode>, PageSchemaDefinitionError> => {
  const infos = input.definitions.map((property) => toInfo(property, new Map()));
  const trees = new Map<string, PageFormulaNode>();
  for (const source of sources) {
    if (source.property.type !== DatabasePropertyType.FORMULA) continue;
    if (source.formula === null) {
      return refuse(PAGE_FORMULA_SAVE_ERROR.SYNTAX, 'A formula property needs a formula', {
        propertyKey: source.property.key,
      });
    }
    const tree = parsePageFormulaTree(source.formula, infos);
    if (tree.isFail()) {
      const error = tree.getError();
      return error.code === PAGE_FORMULA_SAVE_ERROR.UNKNOWN_PROPERTY
        ? explainUnknownProperty(input, source, error)
        : refuseSaveError(source.property, error);
    }
    trees.set(source.property.key, tree.getValue());
  }
  return Result.ok(trees);
};

const buildEdges = (
  input: ComputedPlanInput,
  sources: readonly ComputedSource[],
  trees: ReadonlyMap<string, PageFormulaNode>,
): Result<ReadonlyMap<string, readonly string[]>, PageSchemaDefinitionError> => {
  const edges = new Map<string, readonly string[]>();
  for (const [collectionId, properties] of input.collections) {
    for (const edge of toForeignEdges(collectionId, properties)) edges.set(edge.from, edge.to);
  }
  for (const source of sources) {
    const edge = toOwnEdge(input, source, trees.get(source.property.key) ?? null);
    if (edge.isFail()) return Result.fail(edge.getError());
    edges.set(edge.getValue().from, edge.getValue().to);
  }
  return Result.ok(edges);
};

const checkCycle = (
  input: ComputedPlanInput,
  edges: ReadonlyMap<string, readonly string[]>,
): PageSchemaDefinitionError | null => {
  const cycle = findPageReferenceCycle(edges);
  if (cycle === null) return null;
  const prefix = `${input.collectionId}:`;
  const keys = cycle.filter((node) => node.startsWith(prefix)).map((node) => node.slice(prefix.length));
  return new PageSchemaDefinitionError({
    code: PAGE_FORMULA_SAVE_ERROR.CYCLE,
    message: `${keys.join(', ')} read each other in a cycle`,
    propertyKey: keys[0] ?? null,
  });
};

const measureRollupDepth = (
  edges: ReadonlyMap<string, readonly string[]>,
  rollups: ReadonlySet<string>,
  node: string,
  memo: Map<string, number>,
): number => {
  const known = memo.get(node);
  if (known !== undefined) return known;
  const deepest = Math.max(0, ...(edges.get(node) ?? []).map((next) => measureRollupDepth(edges, rollups, next, memo)));
  const depth = deepest + (rollups.has(node) ? 1 : 0);
  memo.set(node, depth);
  return depth;
};

const listRollupNodes = (input: ComputedPlanInput, sources: readonly ComputedSource[]): ReadonlySet<string> =>
  new Set([
    ...sources
      .filter((source) => source.property.type === DatabasePropertyType.ROLLUP)
      .map((source) => toNodeId(input.collectionId, source.property.key)),
    ...[...input.collections].flatMap(([collectionId, properties]) =>
      properties
        .filter((property) => property.type === DatabasePropertyType.ROLLUP)
        .map((property) => toNodeId(collectionId, property.key)),
    ),
  ]);

const checkDepth = (
  input: ComputedPlanInput,
  sources: readonly ComputedSource[],
  edges: ReadonlyMap<string, readonly string[]>,
): PageSchemaDefinitionError | null => {
  const rollups = listRollupNodes(input, sources);
  const memo = new Map<string, number>();
  const tooDeep = sources.find(
    (source) =>
      source.property.type === DatabasePropertyType.ROLLUP &&
      measureRollupDepth(edges, rollups, toNodeId(input.collectionId, source.property.key), memo) >
        PAGE_ROLLUP_MAX_DEPTH,
  );
  return tooDeep === undefined
    ? null
    : new PageSchemaDefinitionError({
        code: ROLLUP_ERROR.depthExceeded,
        message: `A rollup can read at most ${String(PAGE_ROLLUP_MAX_DEPTH)} rollups in a row`,
        propertyKey: tooDeep.property.key,
      });
};

/** Own computed properties ordered so that each comes after the ones it reads. */
const orderSources = (
  input: ComputedPlanInput,
  sources: readonly ComputedSource[],
  edges: ReadonlyMap<string, readonly string[]>,
): readonly ComputedSource[] => {
  const ordered: ComputedSource[] = [];
  const done = new Set<string>();
  const visit = (source: ComputedSource): void => {
    const node = toNodeId(input.collectionId, source.property.key);
    if (done.has(node)) return;
    done.add(node);
    for (const next of edges.get(node) ?? []) {
      const dependency = sources.find((candidate) => toNodeId(input.collectionId, candidate.property.key) === next);
      if (dependency !== undefined) visit(dependency);
    }
    ordered.push(source);
  };
  sources.forEach(visit);
  return ordered;
};

const toTargetInfo = (
  input: ComputedPlanInput,
  targetCollectionId: string,
  targetKey: string,
  resolution: Resolution,
): PageFormulaPropertyInfo | null => {
  const isOwn = targetCollectionId === input.collectionId;
  const properties = isOwn ? input.definitions : input.collections.get(targetCollectionId);
  const target = properties?.find((property) => property.key === targetKey);
  if (target === undefined) return null;
  return isOwn
    ? toInfo(target, resolution.resultTypes)
    : { ...toInfo(target, new Map()), resultType: readResultType(target) };
};

const resolveRollup = (
  input: ComputedPlanInput,
  source: ComputedSource,
  resolution: Resolution,
): Result<PageComputedConfig, PageSchemaDefinitionError> => {
  const draft = source.rollup;
  if (draft === null)
    return refuse(ROLLUP_ERROR.missing, 'A rollup property needs a rollup', { propertyKey: source.property.key });
  const targetCollectionId = findRelationTarget(input, draft);
  if (targetCollectionId === null) {
    return refuse(ROLLUP_ERROR.relationUnknown, `${draft.relationPropertyKey} is not a relation`, {
      propertyKey: source.property.key,
    });
  }
  const target = toTargetInfo(input, targetCollectionId, draft.targetPropertyKey, resolution);
  if (target === null) {
    return refuse(ROLLUP_ERROR.targetUnknown, `The related collection has no property ${draft.targetPropertyKey}`, {
      propertyKey: source.property.key,
    });
  }
  const targetType = readPageRollupTargetType(target);
  const calculation = listPageRollupCalculationsFor(targetType).find((candidate) => candidate === draft.calculation);
  if (calculation === undefined) {
    return refuse(
      ROLLUP_ERROR.calculationUnavailable,
      `${draft.calculation} cannot be calculated over ${target.label}`,
      { available: listPageRollupCalculationsFor(targetType), propertyKey: source.property.key },
    );
  }
  const rollup: PageRollupDefinition = {
    calculation,
    relationPropertyKey: draft.relationPropertyKey,
    resultType: readPageRollupResultType(calculation, targetType),
    targetCollectionId,
    targetPropertyKey: draft.targetPropertyKey,
  };
  return Result.ok({ formula: null, rollup });
};

const resolveFormula = (
  source: ComputedSource,
  properties: readonly SchemaPropertyDefinition[],
  resolution: Resolution,
): Result<PageComputedConfig, PageSchemaDefinitionError> => {
  const parsed = parsePageFormula(
    source.formula ?? '',
    properties.map((property) => toInfo(property, resolution.resultTypes)),
  );
  return parsed.isFail()
    ? refuseSaveError(source.property, parsed.getError())
    : Result.ok({ formula: parsed.getValue(), rollup: null });
};

const resolveAll = (
  input: ComputedPlanInput,
  ordered: readonly ComputedSource[],
): Result<ReadonlyMap<string, PageComputedConfig>, PageSchemaDefinitionError> => {
  const definitions = new Map<string, PageComputedConfig>();
  const resultTypes = new Map<string, PageFormulaPropertyInfo['resultType']>();
  for (const source of ordered) {
    const resolution: Resolution = { definitions, resultTypes };
    const resolved =
      source.property.type === DatabasePropertyType.ROLLUP
        ? resolveRollup(input, source, resolution)
        : resolveFormula(source, input.definitions, resolution);
    if (resolved.isFail()) return Result.fail(resolved.getError());
    const config = resolved.getValue();
    definitions.set(source.property.key, config);
    resultTypes.set(source.property.key, config.formula?.resultType ?? config.rollup?.resultType ?? null);
  }
  return Result.ok(definitions);
};

const canStillCalculate = (dependent: RollupDependent, definitions: readonly SchemaPropertyDefinition[]): boolean => {
  const target = definitions.find((property) => property.key === dependent.targetPropertyKey);
  if (target === undefined) return false;
  const info: PageFormulaPropertyInfo = {
    key: target.key,
    label: target.label,
    options: target.options,
    resultType: readResultType(target),
    type: target.type,
  };
  const calculations: readonly PageRollupCalculation[] = listPageRollupCalculationsFor(readPageRollupTargetType(info));
  return calculations.some((calculation) => calculation === dependent.calculation);
};

const checkDependents = (
  input: ComputedPlanInput,
  definitions: readonly SchemaPropertyDefinition[],
): PageSchemaDefinitionError | null => {
  const broken = input.dependents.filter((dependent) => !canStillCalculate(dependent, definitions));
  return broken.length === 0
    ? null
    : new PageSchemaDefinitionError({
        code: PROPERTY_IN_USE,
        dependents: broken.map((dependent) => ({ collectionId: dependent.collectionId, key: dependent.key })),
        message: `${broken[0]?.targetPropertyKey ?? 'A property'} is read by a rollup of another collection`,
        propertyKey: broken[0]?.targetPropertyKey ?? null,
      });
};

/** The collections the rollups of the schema being saved read, whether the caller sends them or they are kept. */
export const listOwnRollupTargetIds = (
  definitions: readonly SchemaPropertyDefinition[],
  stored: readonly SchemaPropertyDefinition[],
  drafts: readonly SchemaPropertyDraft[],
): readonly string[] => {
  const targets = definitions
    .filter((property) => property.type === DatabasePropertyType.ROLLUP)
    .flatMap((property) => {
      const relationKey =
        drafts.find((draft) => draft.key === property.key)?.computedDraft?.rollup?.relationPropertyKey ??
        stored.find((candidate) => candidate.key === property.key)?.computed?.rollup?.relationPropertyKey;
      const target = definitions.find((candidate) => candidate.key === relationKey)?.config.targetCollectionId;
      return target === null || target === undefined ? [] : [target];
    });
  return [...new Set(targets)];
};

/** The collections the rollups of an already saved schema read. */
export const listForeignRollupTargetIds = (properties: readonly SchemaPropertyDefinition[]): readonly string[] => [
  ...new Set(properties.flatMap((property) => property.computed?.rollup?.targetCollectionId ?? [])),
];

/**
 * Turns what a caller sends for formulas and rollups into definitions the server trusts: a formula is read against the
 * properties of its collection and a rollup against the related collection, the types of the results are inferred,
 * and a cycle, a chain too long or a property another rollup still reads is refused (ADR 028).
 */
export const planComputedProperties = (input: ComputedPlanInput): PlanResult => {
  const computedProperties = input.definitions.filter((property) => isPageComputedPropertyType(property.type));
  const sources = computedProperties.map((property) => readSource(input, property));
  const trees = parseTrees(input, sources);
  if (trees.isFail()) return Result.fail(trees.getError());
  const edges = buildEdges(input, sources, trees.getValue());
  if (edges.isFail()) return Result.fail(edges.getError());
  const problem = checkCycle(input, edges.getValue()) ?? checkDepth(input, sources, edges.getValue());
  if (problem !== null) return Result.fail(problem);
  const resolved = resolveAll(input, orderSources(input, sources, edges.getValue()));
  if (resolved.isFail()) return Result.fail(resolved.getError());
  const definitions = input.definitions.map((property) => {
    const computed = resolved.getValue().get(property.key);
    return computed === undefined ? property : { ...property, computed };
  });
  const inUse = checkDependents(input, definitions);
  return inUse === null ? Result.ok(definitions) : Result.fail(inUse);
};
