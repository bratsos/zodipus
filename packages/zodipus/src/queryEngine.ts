import type { ZodTypeAny, z } from 'zod';
import { ZodipusValidationError } from './errors';

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type InferZodType<T extends ZodTypeAny> = z.infer<T>;

/**
 * Result type for safeParse operations
 */
export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * Generic model registry type - accepts any object with ZodTypeAny schemas
 * @example
 * const models = {
 *   user: UserSchema,
 *   post: PostSchema,
 * } as const;
 */
export type ModelRegistry = Record<string, ZodTypeAny>;

/**
 * Configuration for a single relation
 */
export type RelationConfig<TModelName extends string = string> = {
  type: TModelName;
  isArray: boolean;
  relations?: Record<string, RelationConfig<TModelName>>;
};

/**
 * Generic model relations type
 * @example
 * const modelRelations = {
 *   user: {
 *     posts: { type: 'post' as const, isArray: true as const }
 *   }
 * } as const;
 */
export type ModelRelations = Record<string, Record<string, RelationConfig>>;

// Helper to get all possible keys (for error messages)
type ValidKeys<T> = keyof T;

// Strict select type that only allows keys from T
type StrictSelect<T> = {
  [K in keyof T]?: K extends ValidKeys<T> ? boolean : never;
};

type SelectQuery<T> = {
  select: StrictSelect<T>;
};

type RelationQueryValue<TRelation extends RelationConfig> =
  | boolean
  | { select: Record<string, boolean> }
  | {
      include: TRelation['relations'] extends Record<string, RelationConfig>
        ? {
            [K in keyof TRelation['relations']]?: RelationQueryValue<TRelation['relations'][K]>;
          }
        : never;
    };

type QueryConfig<
  TModel extends ZodTypeAny,
  TRelations extends Record<string, RelationConfig>,
> = Partial<SelectQuery<InferZodType<TModel>>> & {
  [K in keyof TRelations]?: RelationQueryValue<TRelations[K]>;
};

export type QueryExecutor<
  TModel extends ZodTypeAny,
  TRelations extends Record<string, RelationConfig>,
  TQuery extends QueryConfig<TModel, TRelations>,
  TModels extends ModelRegistry = ModelRegistry,
> = {
  query: TQuery extends { select: infer S }
    ? {
        select: S & {
          [K in keyof TRelations & keyof TQuery]: TQuery[K] extends {
            select: infer S;
          }
            ? { select: S }
            : TQuery[K] extends { include: infer I }
              ? { include: I }
              : TQuery[K] extends true
                ? true
                : never;
        };
      }
    : {
        include: {
          [K in keyof TRelations & keyof TQuery]: TQuery[K] extends {
            select: infer S;
          }
            ? { select: S }
            : TQuery[K] extends { include: infer I }
              ? { include: I }
              : TQuery[K] extends true
                ? true
                : never;
        };
      };
  parse: (data: unknown) => InferQueryResult<TModel, TRelations, TQuery, TModels>;
  safeParse: (
    data: unknown
  ) => SafeParseResult<InferQueryResult<TModel, TRelations, TQuery, TModels>>;
  array: () => {
    parse: (data: unknown[]) => InferQueryResult<TModel, TRelations, TQuery, TModels>[];
    safeParse: (
      data: unknown[]
    ) => SafeParseResult<InferQueryResult<TModel, TRelations, TQuery, TModels>[]>;
  };
};

type InferQueryResult<
  TModel extends ZodTypeAny,
  TRelations extends Record<string, RelationConfig>,
  TQuery extends QueryConfig<TModel, TRelations>,
  TModels extends ModelRegistry = ModelRegistry,
> = Simplify<
  (TQuery extends { select: infer Select }
    ? Pick<InferZodType<TModel>, keyof Select & keyof InferZodType<TModel>>
    : InferZodType<TModel>) & {
    [K in keyof TQuery & keyof TRelations]: TQuery[K] extends {
      select: Record<infer SelectKey, boolean>;
    }
      ? TRelations[K]['isArray'] extends true
        ? Pick<
            InferZodType<TModels[TRelations[K]['type']]>,
            SelectKey & keyof InferZodType<TModels[TRelations[K]['type']]>
          >[]
        : Pick<
            InferZodType<TModels[TRelations[K]['type']]>,
            SelectKey & keyof InferZodType<TModels[TRelations[K]['type']]>
          >
      : TQuery[K] extends { include: infer Include }
        ? TRelations[K] extends {
            relations: Record<string, RelationConfig>;
          }
          ? InferZodType<TModels[TRelations[K]['type']]> & {
              [NK in keyof Include & keyof TRelations[K]['relations']]: Include[NK] extends {
                select: Record<infer SelectKey, boolean>;
              }
                ? TRelations[K]['relations'][NK] extends RelationConfig
                  ? TRelations[K]['relations'][NK]['isArray'] extends true
                    ? Pick<
                        InferZodType<TModels[TRelations[K]['relations'][NK]['type']]>,
                        SelectKey &
                          keyof InferZodType<TModels[TRelations[K]['relations'][NK]['type']]>
                      >[]
                    : Pick<
                        InferZodType<TModels[TRelations[K]['relations'][NK]['type']]>,
                        SelectKey &
                          keyof InferZodType<TModels[TRelations[K]['relations'][NK]['type']]>
                      >
                  : never
                : Include[NK] extends true
                  ? TRelations[K]['relations'][NK] extends RelationConfig
                    ? TRelations[K]['relations'][NK]['isArray'] extends true
                      ? InferZodType<TModels[TRelations[K]['relations'][NK]['type']]>[]
                      : InferZodType<TModels[TRelations[K]['relations'][NK]['type']]>
                    : never
                  : never;
            }
          : InferZodType<TModels[TRelations[K]['type']]>
        : TQuery[K] extends true
          ? TRelations[K]['isArray'] extends true
            ? InferZodType<TModels[TRelations[K]['type']]>[]
            : InferZodType<TModels[TRelations[K]['type']]>
          : never;
  }
>;

/**
 * Create a type-safe query registry for your Prisma models
 *
 * @example
 * ```typescript
 * import { createRegistry } from 'zodipus/queryEngine';
 * import { models, modelRelations } from './generated/generated-index';
 *
 * const registry = createRegistry({
 *   models,
 *   relations: modelRelations,
 * });
 *
 * export const userQuery = registry.createQuery('user');
 * export const postQuery = registry.createQuery('post');
 * ```
 */
export function createRegistry<
  TModels extends ModelRegistry,
  TRelations extends ModelRelations,
>(config: {
  models: TModels;
  relations: TRelations;
}) {
  // Build explicit relation types by directly mapping over the relations
  // This provides better autocomplete than conditional types
  type BuildRelationTypes<TRelations extends Record<string, RelationConfig>> = {
    [K in keyof TRelations]: TRelations[K]['type'] extends keyof TModels
      ?
          | boolean
          | {
              select: {
                [F in keyof InferZodType<TModels[TRelations[K]['type']]>]?: boolean;
              };
            }
          | {
              include: TRelations[K]['relations'] extends Record<string, RelationConfig>
                ? {
                    [NK in keyof TRelations[K]['relations']]?: TRelations[K]['relations'][NK]['type'] extends keyof TModels
                      ?
                          | boolean
                          | {
                              select: {
                                [F in keyof InferZodType<
                                  TModels[TRelations[K]['relations'][NK]['type']]
                                >]?: boolean;
                              };
                            }
                      : boolean | { select: Record<string, boolean> };
                  }
                : never;
            }
      : boolean | { select: Record<string, boolean> };
  };

  type TypedQueryConfig<
    TModel extends ZodTypeAny,
    TRelations extends Record<string, RelationConfig>,
  > = Partial<SelectQuery<InferZodType<TModel>>> & Partial<BuildRelationTypes<TRelations>>;

  return {
    createQuery: <TModel extends keyof TModels & string>(model: TModel) => {
      type ResultType = InferQueryResult<
        TModels[TModel],
        TRelations[TModel],
        QueryConfig<TModels[TModel], TRelations[TModel]>,
        TModels
      >;

      return <TQuery extends TypedQueryConfig<TModels[TModel], TRelations[TModel]>>(
        query: TQuery
      ): QueryExecutor<
        TModels[TModel],
        TRelations[TModel],
        TQuery & QueryConfig<TModels[TModel], TRelations[TModel]>,
        TModels
      > => {
        const createParser = (isArray: boolean) => {
          return (data: unknown) => {
            const parseRelations = (item: unknown) => {
              // Basic validation: data must be an object
              if (typeof item !== 'object' || item === null) {
                throw new ZodipusValidationError(`Invalid data for model "${String(model)}"`, {
                  model: String(model),
                  expected: 'object',
                  received: item === null ? 'null' : typeof item,
                });
              }

              // When using select, we don't validate against the full schema
              // We just validate the data as-is and handle relations
              let result: Record<string, unknown>;

              if (hasSelect) {
                // With select, just use the data as-is (Prisma already validated it)
                // We trust Prisma to return the correct shape based on our select query
                result = item as Record<string, unknown>;
              } else {
                // Without select, use the full Zod schema for validation
                const modelSchema = config.models[model];
                if (!modelSchema) {
                  throw new ZodipusValidationError('Model schema not found', {
                    model: String(model),
                  });
                }
                const parsed = modelSchema.parse(item);
                result = parsed as Record<string, unknown>;
              }

              // Parse relations
              for (const [key, value] of Object.entries(query)) {
                if (key === 'select') continue;
                if (typeof item === 'object' && item !== null && key in item) {
                  const modelRelations = config.relations[model];
                  if (!modelRelations) continue;

                  const relationType = modelRelations[key]?.type;
                  if (!relationType) continue;

                  // Check if this relation has a select clause
                  const relationHasSelectOrInclude =
                    typeof value === 'object' &&
                    value !== null &&
                    ('select' in value || 'include' in value);

                  if (Array.isArray((item as Record<string, unknown>)[key])) {
                    result[key] = ((item as Record<string, unknown>)[key] as unknown[]).map(
                      (rel: unknown) => {
                        // If relation has select, just return the data as-is
                        // Otherwise use full Zod schema validation
                        if (relationHasSelectOrInclude) {
                          return rel;
                        }
                        const relationSchema = config.models[relationType];
                        if (!relationSchema) {
                          throw new ZodipusValidationError('Model schema not found for relation', {
                            model: relationType,
                            field: key,
                            path: [String(model), key],
                          });
                        }
                        return relationSchema.parse(rel);
                      }
                    );
                  } else {
                    const relData = (item as Record<string, unknown>)[key];
                    // Handle null relations (optional relations)
                    if (relData === null) {
                      result[key] = null;
                    } else if (relationHasSelectOrInclude) {
                      // If relation has select/include, just return the data as-is
                      result[key] = relData;
                    } else {
                      // Otherwise use full Zod schema validation
                      const relationSchema = config.models[relationType];
                      if (!relationSchema) {
                        throw new ZodipusValidationError('Model schema not found for relation', {
                          model: relationType,
                          field: key,
                          path: [String(model), key],
                        });
                      }
                      result[key] = relationSchema.parse(relData);
                    }
                  }
                }
              }

              return result;
            };

            if (isArray) {
              const arrayData = data as unknown[];
              return arrayData.map(parseRelations);
            }

            return parseRelations(data) as unknown as ResultType;
          };
        };
        // Build the query object for Prisma
        const relationEntries = Object.fromEntries(
          Object.entries(query).filter(([key]) => key !== 'select')
        );

        const hasSelect = 'select' in query && query.select;
        const hasRelations = Object.keys(relationEntries).length > 0;

        // If we have a select query with relations, we need to merge them into the select
        let selectQuery: Record<string, unknown>;
        let includeQuery: Record<string, unknown>;

        if (hasSelect && hasRelations) {
          // Merge: select fields + relations go into select
          selectQuery = {
            ...(query.select ?? {}),
            ...relationEntries,
          };
          includeQuery = {};
        } else if (hasSelect && !hasRelations) {
          // Only select, no relations
          selectQuery = query.select ?? {};
          includeQuery = {};
        } else if (!hasSelect && hasRelations) {
          // Only relations, use include
          selectQuery = {};
          includeQuery = relationEntries;
        } else {
          // Neither select nor relations (should not happen in practice)
          selectQuery = {};
          includeQuery = {};
        }

        return {
          query: (hasSelect
            ? { select: selectQuery }
            : { include: includeQuery }) as TQuery extends { select: infer S }
            ? {
                select: S & {
                  [K in keyof TRelations[TModel] & keyof TQuery]: TQuery[K] extends {
                    select: infer S;
                  }
                    ? { select: S }
                    : TQuery[K] extends { include: infer I }
                      ? { include: I }
                      : TQuery[K] extends true
                        ? true
                        : never;
                };
              }
            : {
                include: {
                  [K in keyof TRelations[TModel] & keyof TQuery]: TQuery[K] extends {
                    select: infer S;
                  }
                    ? { select: S }
                    : TQuery[K] extends { include: infer I }
                      ? { include: I }
                      : TQuery[K] extends true
                        ? true
                        : never;
                };
              },
          parse: createParser(false) as (data: unknown) => ResultType,
          safeParse: ((data: unknown) => {
            try {
              return { success: true, data: createParser(false)(data) };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
              };
            }
          }) as (data: unknown) => SafeParseResult<ResultType>,
          array: () => ({
            parse: createParser(true) as (data: unknown[]) => ResultType[],
            safeParse: ((data: unknown[]) => {
              try {
                return { success: true, data: createParser(true)(data) };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error : new Error(String(error)),
                };
              }
            }) as (data: unknown[]) => SafeParseResult<ResultType[]>,
          }),
        };
      };
    },
  };
}
