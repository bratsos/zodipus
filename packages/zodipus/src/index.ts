import { generatorHandler } from '@prisma/generator-helper';
import type { GeneratorOptions } from '@prisma/generator-helper';
import { generate } from './generator';

export { createRegistry } from './queryEngine';
export type {
  ModelRegistry,
  ModelRelations,
  RelationConfig,
  QueryExecutor,
  SafeParseResult,
} from './queryEngine';

// Export error types
export {
  ZodipusError,
  ZodipusValidationError,
  ZodipusGeneratorError,
} from './errors';
export type { ValidationErrorContext } from './errors';

// Prisma Generator Handler
generatorHandler({
  onManifest() {
    return {
      prettyName: 'Zodipus - Prisma Zod Schema Generator',
      defaultOutput: '../generated',
    };
  },

  async onGenerate(options: GeneratorOptions) {
    await generate(options);
  },
});
