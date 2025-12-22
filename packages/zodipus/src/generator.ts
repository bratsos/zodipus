import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DMMF, GeneratorOptions } from '@prisma/generator-helper';

/**
 * Configuration options for Zodipus generator
 */
interface ZodipusConfig {
  /** How to handle DateTime fields: 'coerce' uses z.coerce.date(), 'string' uses z.string().datetime() */
  dateFormat: 'coerce' | 'string';
  /** Whether to enable passthrough mode for objects (allows extra keys) */
  passthroughEnabled: boolean;
  /** Maximum depth for relation nesting */
  relationDepth: number;
  /** Enable debug logging */
  debug: boolean;
  /** Zod import path for generated files. Default: 'zod'. Advanced: use 'zod/v4' or 'zod/v3' for explicit versioning */
  zodImport: string;
  /** Preview output without writing files */
  dryRun: boolean;
}

/**
 * Parse configuration from Prisma generator options
 * @internal
 */
export function parseConfig(options: GeneratorOptions): ZodipusConfig {
  const config = options.generator.config;

  const getConfigValue = (key: string, defaultValue: string): string => {
    const value = config[key];
    if (Array.isArray(value)) return value[0] ?? defaultValue;
    return value ?? defaultValue;
  };

  return {
    dateFormat: getConfigValue('dateFormat', 'coerce') as 'coerce' | 'string',
    passthroughEnabled: getConfigValue('passthroughEnabled', 'false') === 'true',
    relationDepth: Number.parseInt(getConfigValue('relationDepth', '5')),
    debug: getConfigValue('debug', 'false') === 'true',
    zodImport: getConfigValue('zodImport', 'zod'),
    dryRun: process.env.ZODIPUS_DRY_RUN === 'true',
  };
}

export async function generate(options: GeneratorOptions) {
  // Handle Inspect Command (CLI wrapper)
  if (process.env.ZODIPUS_CMD === 'inspect') {
    await inspectSchema(options.dmmf);
    return;
  }

  const outputDir = options.generator.output?.value;

  if (!outputDir) {
    throw new Error('No output directory specified');
  }

  // Parse configuration
  const config = parseConfig(options);

  // Helper function to log only in debug mode
  const log = (...args: unknown[]) => {
    if (config.debug) {
      console.log(...args);
    }
  };

  // Resolve the output directory relative to the schema location
  const resolvedOutputDir = resolve(dirname(options.schemaPath), outputDir);

  log('🔧 Zodipus generator');
  log(`📁 Output directory: ${resolvedOutputDir}`);
  log(
    `⚙️  Config: dateFormat=${config.dateFormat}, passthroughEnabled=${config.passthroughEnabled}, relationDepth=${config.relationDepth}`
  );

  // Step 1: Generate clean Zod model schemas
  log('📦 Generating clean Zod model schemas...');
  await generateCleanModelSchemas(options, resolvedOutputDir, log, config);

  // Step 2: Extract and generate relations
  log('🔗 Extracting relations from DMMF...');
  log(`   Total models in schema: ${options.dmmf.datamodel.models.length}`);

  const relations = extractRelationsFromDMMF(options.dmmf, config.relationDepth);

  log(`   Found ${Object.keys(relations).length} models with relations`);

  const relationsCode = formatRelationsAsTypeScript(relations, config.relationDepth);
  const relationsPath = resolve(resolvedOutputDir, 'generated-relations.ts');

  if (!config.dryRun) {
    mkdirSync(dirname(relationsPath), { recursive: true });
    writeFileSync(relationsPath, relationsCode, 'utf-8');
  } else {
    log(`   [DRY RUN] Would write to ${relationsPath}`);
  }

  log(`   ✅ Relations written to ${relationsPath}`);

  // Step 3: Generate index file
  log('📝 Generating index file...');
  const indexCode = generateIndexFile(options.dmmf);
  const indexPath = resolve(resolvedOutputDir, 'generated-index.ts');

  if (!config.dryRun) {
    writeFileSync(indexPath, indexCode, 'utf-8');
  } else {
    log(`   [DRY RUN] Would write to ${indexPath}`);
  }

  log('✅ Query Engine generation complete!');
}

async function generateCleanModelSchemas(
  options: GeneratorOptions,
  outputDir: string,
  log: (...args: unknown[]) => void,
  config: ZodipusConfig
) {
  const models = options.dmmf.datamodel.models;
  const enums = options.dmmf.datamodel.enums;
  const enumNames = new Set(enums.map((e) => e.name));

  log(`   Found ${models.length} models and ${enums.length} enums`);

  // Collect custom schemas from field documentation
  const customSchemas = new Set<string>();
  for (const model of models) {
    const scalarFields = model.fields.filter((field) => field.kind !== 'object');
    for (const field of scalarFields) {
      const customSchema = extractCustomSchema(field.documentation);
      if (customSchema) {
        customSchemas.add(customSchema);
      }
    }
  }

  // Generate enum schemas first
  const enumSchemas: string[] = [];
  for (const enumDef of enums) {
    const enumCode = generateEnumSchema(enumDef, config);
    enumSchemas.push(enumCode);
  }

  // Collect all used enums across all models
  const usedEnums = new Set<string>();
  for (const model of models) {
    const scalarFields = model.fields.filter((field) => field.kind !== 'object');
    for (const field of scalarFields) {
      if (enumNames.has(field.type)) {
        usedEnums.add(field.type);
      }
    }
  }

  // Generate model schemas (without relations)
  const modelSchemas: string[] = [];
  for (const model of models) {
    const modelCode = generateModelSchema(model, enums, config);
    modelSchemas.push(modelCode);
  }

  // Write enums file with single import at top
  const enumsCode = `import { z } from '${config.zodImport}';\n\n${enumSchemas.map((s) => s.replace(/import \{ z \} from '[^']+';\n\n/g, '')).join('\n\n')}`;

  const enumsPath = resolve(outputDir, 'enums.ts');
  if (!config.dryRun) {
    writeFileSync(enumsPath, enumsCode, 'utf-8');
  } else {
    log(`   [DRY RUN] Would write to ${enumsPath}`);
  }

  // Write models file with consolidated imports
  const enumImportList = Array.from(usedEnums)
    .sort()
    .map((name) => `${name}Schema`)
    .join(', ');
  const customSchemaImportList = Array.from(customSchemas).sort().join(', ');

  const modelImports = [`import { z } from '${config.zodImport}';`];
  if (usedEnums.size > 0) {
    modelImports.push(`import { ${enumImportList} } from './enums';`);
  }
  if (customSchemas.size > 0) {
    modelImports.push(`import { ${customSchemaImportList} } from './custom-schemas';`);
  }

  const modelsCodeWithoutImports = modelSchemas
    .map((s) =>
      s
        .replace(/import \{ z \} from '[^']+';\n/g, '')
        .replace(/import \{ [^}]+ \} from '\.\/enums';\n/g, '')
        .replace(/import \{ [^}]+ \} from '\.\/custom-schemas';\n/g, '')
        .trim()
    )
    .join('\n\n');

  const modelsCode = `${modelImports.join('\n')}\n\n${modelsCodeWithoutImports}`;

  const modelsPath = resolve(outputDir, 'models.ts');
  if (!config.dryRun) {
    writeFileSync(modelsPath, modelsCode, 'utf-8');
  } else {
    log(`   [DRY RUN] Would write to ${modelsPath}`);
  }

  // Create custom-schemas.ts template if custom schemas are used
  if (customSchemas.size > 0) {
    generateCustomSchemasTemplate(outputDir, customSchemas, log, config);
  }

  log(`   ✅ Generated ${enums.length} enums and ${models.length} model schemas`);
  if (customSchemas.size > 0) {
    log(`   📝 Found ${customSchemas.size} custom schema references - update custom-schemas.ts`);
  }
}

function generateCustomSchemasTemplate(
  outputDir: string,
  customSchemas: Set<string>,
  log: (...args: unknown[]) => void,
  config: ZodipusConfig
) {
  const customSchemasPath = resolve(outputDir, 'custom-schemas.ts');

  // Check if file already exists - don't overwrite it
  if (existsSync(customSchemasPath)) {
    log('   ⚠️  custom-schemas.ts already exists, skipping template generation');
    return;
  }

  const schemaTemplates = Array.from(customSchemas)
    .map((schemaName) => {
      return `/**
 * ${schemaName} schema
 */
export const ${schemaName} = z.any(); // Replace with your schema`;
    })
    .join('\n\n');

  const template = `import { z } from '${config.zodImport}';

/**
 * Custom Zod schemas for JSON fields
 * 
 * This file contains custom schemas referenced via @zodSchema annotations
 * in your Prisma schema. Update these with your actual schema definitions.
 */

${schemaTemplates}
`;

  if (!config.dryRun) {
    writeFileSync(customSchemasPath, template, 'utf-8');
    log(`   ✨ Created custom-schemas.ts template at ${customSchemasPath}`);
  } else {
    log(`   [DRY RUN] Would create template at ${customSchemasPath}`);
  }
}

async function inspectSchema(dmmf: DMMF.Document) {
  const flags = process.env.ZODIPUS_INSPECT_FLAGS || '';
  const showModels = flags.includes('models');
  const showEnums = flags.includes('enums');
  const showRelations = flags.includes('relations');
  const showAll = !showModels && !showEnums && !showRelations;
  const asJson = process.env.ZODIPUS_INSPECT_JSON === 'true';

  if (asJson) {
    const output: Record<string, unknown> = {};
    if (showAll || showModels) {
      output.models = dmmf.datamodel.models.map((m) => ({
        name: m.name,
        fields: m.fields.map((f) => ({
          name: f.name,
          type: f.type,
          isRequired: f.isRequired,
          isList: f.isList,
          isId: f.isId,
          isUnique: f.isUnique,
        })),
      }));
    }
    if (showAll || showEnums) {
      output.enums = dmmf.datamodel.enums.map((e) => ({
        name: e.name,
        values: e.values.map((v) => v.name),
      }));
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Text output
  if (showAll || showModels) {
    console.log('📦 Models:');
    console.log('─'.repeat(50));
    for (const model of dmmf.datamodel.models) {
      const fieldCount = model.fields.length;
      const scalarCount = model.fields.filter((f) => f.kind !== 'object').length;
      const relationCount = fieldCount - scalarCount;
      console.log(`  ${model.name} (${scalarCount} fields, ${relationCount} relations)`);

      for (const field of model.fields) {
        const markers: string[] = [];
        if (field.isId) markers.push('@id');
        if (field.isUnique) markers.push('@unique');
        if (!field.isRequired) markers.push('optional');
        if (field.isList) markers.push('[]');

        const markerStr = markers.length > 0 ? ` [${markers.join(', ')}]` : '';
        const typeStr = field.kind === 'object' ? `→ ${field.type}` : field.type;
        console.log(`    • ${field.name}: ${typeStr}${markerStr}`);
      }
      console.log();
    }
  }

  if (showAll || showEnums) {
    console.log('\n🏷️  Enums:');
    console.log('─'.repeat(50));
    for (const enumDef of dmmf.datamodel.enums) {
      const values = enumDef.values.map((v) => v.name).join(', ');
      console.log(`  ${enumDef.name}: ${values}`);
    }
    console.log();
  }

  if (showAll || showRelations) {
    console.log('\n🔗 Relations:');
    console.log('─'.repeat(50));
    for (const model of dmmf.datamodel.models) {
      const relations = model.fields.filter((f) => f.kind === 'object');
      if (relations.length > 0) {
        console.log(`  ${model.name}:`);
        for (const rel of relations) {
          const arrow = rel.isList ? '─┬▶' : '──▶';
          console.log(`    ${arrow} ${rel.type} (via ${rel.name})`);
        }
      }
    }
    console.log();
  }

  console.log('✅ Inspection complete\n');
}

function generateEnumSchema(enumDef: DMMF.DatamodelEnum, config: ZodipusConfig): string {
  const values = enumDef.values.map((v) => `  '${v.name}'`).join(',\n');

  // Build JSDoc for enum
  const jsDocLines = ['/**'];
  jsDocLines.push(` * ${enumDef.name} enum schema`);
  if (enumDef.documentation) {
    jsDocLines.push(` * @description ${enumDef.documentation}`);
  }
  jsDocLines.push(` * @values ${enumDef.values.map((v) => v.name).join(', ')}`);
  jsDocLines.push(' */');
  const jsDoc = jsDocLines.join('\n');

  return `import { z } from '${config.zodImport}';

${jsDoc}
export const ${enumDef.name}Schema = z.enum([\n${values}\n]);

export type ${enumDef.name} = z.infer<typeof ${enumDef.name}Schema>;`;
}

function generateModelSchema(
  model: DMMF.Model,
  enums: readonly DMMF.DatamodelEnum[],
  config: ZodipusConfig
): string {
  const enumNames = new Set(enums.map((e) => e.name));

  // Filter out relation fields (kind === 'object')
  const scalarFields = model.fields.filter((field) => field.kind !== 'object');

  const imports: string[] = [`import { z } from '${config.zodImport}';`];
  const enumImports = new Set<string>();
  const customSchemaImports = new Set<string>();
  const fieldDefinitions: string[] = [];

  for (const field of scalarFields) {
    // Check if field has custom schema annotation
    const customSchema = extractCustomSchema(field.documentation);

    let zodType: string;
    if (customSchema) {
      zodType = customSchema;
      customSchemaImports.add(customSchema);
    } else {
      zodType = mapPrismaTypeToZod(field, enumNames, config);

      // Track enum imports
      if (enumNames.has(field.type)) {
        enumImports.add(field.type);
      }
    }

    const optional = field.isRequired ? '' : '.optional()';
    const nullable = field.isRequired ? '' : '.nullable()';
    const array = field.isList ? '.array()' : '';

    let fieldDef = `  ${field.name}: ${zodType}${array}${optional}${nullable}`;

    // Build comprehensive JSDoc for field
    const fieldDocLines: string[] = [];

    if (field.documentation) {
      // Add field documentation
      const cleanDoc = field.documentation.replace(/@zodSchema\s+\w+/g, '').trim();
      if (cleanDoc) {
        fieldDocLines.push(cleanDoc);
      }
    }

    // Add validation constraint hints
    const constraints: string[] = [];
    if (field.isId) constraints.push('@id');
    if (field.isUnique) constraints.push('@unique');

    if (field.hasDefaultValue) {
      const defaultVal = formatDefaultValue(field.default);
      constraints.push(`@default(${defaultVal})`);
    }
    if (field.isUpdatedAt) constraints.push('@updatedAt');
    if (!field.isRequired) constraints.push('optional');

    if (constraints.length > 0) {
      fieldDocLines.push(`Prisma: ${constraints.join(', ')}`);
    }

    if (fieldDocLines.length > 0) {
      fieldDef = `  /** ${fieldDocLines.join(' | ')} */\n${fieldDef}`;
    }

    fieldDefinitions.push(fieldDef);
  }

  // Add enum imports
  if (enumImports.size > 0) {
    const enumImportList = Array.from(enumImports)
      .map((name) => `${name}Schema`)
      .sort()
      .join(', ');
    imports.push(`import { ${enumImportList} } from './enums';`);
  }

  // Add custom schema imports
  if (customSchemaImports.size > 0) {
    const customImportList = Array.from(customSchemaImports).sort().join(', '); // Sort for deterministic output
    imports.push(`import { ${customImportList} } from './custom-schemas';`);
  }

  // Apply strictMode setting
  const schemaModifier = config.passthroughEnabled ? '.passthrough()' : '';

  return `${imports.join('\n')}

/**
 * ${model.name} model (clean schema without relations)
 */
export const ${model.name}Schema = z.object({
${fieldDefinitions.join(',\n')}
})${schemaModifier};

export type ${model.name} = z.infer<typeof ${model.name}Schema>;`;
}

/**
 * Extract custom schema name from field documentation
 * Looks for pattern: @zodSchema SchemaName
 * @internal
 */
export function extractCustomSchema(documentation: string | undefined): string | null {
  if (!documentation) return null;

  const match = documentation.match(/@zodSchema\s+(\w+)/);
  return match ? match[1]! : null;
}

/**
 * Format Prisma default value for documentation
 * standardized across Prisma versions (v5/v6)
 * @internal
 */
function formatDefaultValue(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'name' in value && 'args' in value) {
    const { name, args } = value as { name: string; args: unknown[] };
    // Handle Prisma 5 vs 6 differences
    // v6: name="uuid", args=[4] -> "uuid(4)"
    // v5: name="uuid(4)", args=[] -> "uuid(4)"

    // If name already looks like a function call, use it as is
    if (name.includes('(')) return name;

    // Otherwise construct function call
    if (Array.isArray(args) && args.length > 0) {
      return `${name}(${args.join(', ')})`;
    }
    return `${name}()`;
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Map Prisma field type to Zod validator string
 * @internal
 */
export function mapPrismaTypeToZod(
  field: DMMF.Field,
  enumNames: Set<string>,
  config: ZodipusConfig
): string {
  // Check if it's an enum
  if (enumNames.has(field.type)) {
    return `${field.type}Schema`;
  }

  // Map Prisma scalar types to Zod types
  switch (field.type) {
    case 'String':
      return 'z.string()';
    case 'Int':
      return 'z.number().int()';
    case 'BigInt':
      return 'z.bigint()';
    case 'Float':
      return 'z.number()';
    case 'Decimal':
      // Prisma Decimal can be a Decimal.js object, number, or string
      // We accept all and coerce to string for consistency
      return 'z.union([z.number(), z.string(), z.custom<{ toString(): string }>((val) => typeof val === "object" && val !== null && "toString" in val)]).transform(String)';
    case 'Boolean':
      return 'z.boolean()';
    case 'DateTime':
      // dateFormat option: 'coerce' uses z.coerce.date(), 'string' uses z.string().datetime()
      return config.dateFormat === 'string' ? 'z.string().datetime()' : 'z.coerce.date()';
    case 'Json':
      return 'z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())])';
    case 'Bytes':
      return 'z.instanceof(Buffer)';
    default:
      return 'z.unknown()';
  }
}

interface RelationConfig {
  type: string;
  isArray: boolean;
  relations?: Record<string, RelationConfig>;
}

function extractRelationsFromDMMF(
  dmmf: DMMF.Document,
  maxDepth: number
): Record<string, Record<string, RelationConfig>> {
  const relations: Record<string, Record<string, RelationConfig>> = {};

  // Create a lookup map for quick access
  const modelMap = new Map(dmmf.datamodel.models.map((m) => [m.name, m]));

  function extractForModel(
    modelName: string,
    depth: number,
    visited: Set<string>
  ): Record<string, RelationConfig> {
    if (depth > maxDepth || visited.has(modelName)) {
      return {};
    }

    const model = modelMap.get(modelName);
    if (!model) return {};

    const newVisited = new Set(visited);
    newVisited.add(modelName);

    const result: Record<string, RelationConfig> = {};

    for (const field of model.fields) {
      // Only process relation fields (kind === 'object' means it's a relation)
      if (field.kind === 'object') {
        const nestedRelations = extractForModel(field.type, depth + 1, newVisited);

        result[field.name] = {
          type: toCamelCase(field.type),
          isArray: field.isList,
          ...(Object.keys(nestedRelations).length > 0 && {
            relations: nestedRelations,
          }),
        };
      }
    }

    return result;
  }

  for (const model of dmmf.datamodel.models) {
    // Start at depth 0, and the model itself is not in visited yet
    const modelRelations = extractForModel(model.name, 0, new Set());

    if (Object.keys(modelRelations).length > 0) {
      relations[toCamelCase(model.name)] = modelRelations;
    }
  }

  return relations;
}

function formatRelationsAsTypeScript(
  relations: Record<string, Record<string, RelationConfig>>,
  maxDepth: number
): string {
  const formatValue = (value: unknown, indent: number): string => {
    const spaces = '  '.repeat(indent);

    if (typeof value === 'string') {
      return `"${value}" as const`;
    }

    if (typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value);
      if (entries.length === 0) return '{}';

      const formattedEntries = entries.map(([key, val]) => {
        const formattedVal = formatValue(val, indent + 1);
        return `${spaces}  ${key}: ${formattedVal},`;
      });

      return `{\n${formattedEntries.join('\n')}\n${spaces}}`;
    }

    return String(value);
  };

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Auto-generated relation metadata from Prisma schema');
  lines.push(` * Generated on: ${new Date().toISOString()}`);
  lines.push(` * Max nesting depth: ${maxDepth}`);
  lines.push(' *');
  lines.push(' * Generated by zodipus');
  lines.push(' * To regenerate: prisma generate');
  lines.push(' */');
  lines.push('');
  lines.push('const modelRelations = {');

  const entries = Object.entries(relations);
  for (let i = 0; i < entries.length; i++) {
    const [modelName, modelRelations] = entries[i]!;
    const formattedRelations = formatValue(modelRelations, 1);
    const comma = i < entries.length - 1 ? ',' : '';
    lines.push(`  ${modelName}: ${formattedRelations}${comma}`);
  }

  lines.push('} as const;');
  lines.push('');
  lines.push('export default modelRelations;');
  lines.push('');

  return lines.join('\n');
}

function generateIndexFile(dmmf: DMMF.Document): string {
  const modelNames = dmmf.datamodel.models.map((m) => m.name);
  const enumNames = dmmf.datamodel.enums.map((e) => e.name);

  const modelTypeExports = modelNames.map((name) => `  ${name},`).join('\n');
  const enumTypeExports = enumNames.map((name) => `  ${name},`).join('\n');

  return `/**
 * Generated export from zodipus
 *
 * This file exports:
 * - Clean Zod model schemas (without relations)
 * - Enum schemas
 * - Relation metadata
 */

// Export enum schemas
export * from './enums';

// Export model schemas
export * as models from './models';

// Export relation metadata
export { default as modelRelations } from './generated-relations';

// Re-export types for convenience
export type {
${modelTypeExports}
} from './models';

export type {
${enumTypeExports}
} from './enums';
`;
}

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
