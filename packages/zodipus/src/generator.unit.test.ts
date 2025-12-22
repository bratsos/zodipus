import type { GeneratorOptions } from '@prisma/generator-helper';
import { describe, expect, it } from 'vitest';
import { extractCustomSchema, mapPrismaTypeToZod, parseConfig } from './generator';

describe('Generator Unit Tests', () => {
  describe('parseConfig', () => {
    it('should return default config with empty options', () => {
      const options = {
        generator: { config: {} },
      } as any as GeneratorOptions;

      const config = parseConfig(options);
      expect(config).toEqual({
        dateFormat: 'coerce',
        passthroughEnabled: false,
        relationDepth: 5,
        debug: false,
        zodImport: 'zod',
        dryRun: false,
      });
    });

    it('should override defaults with generator config', () => {
      const options = {
        generator: {
          config: {
            dateFormat: 'string',
            passthroughEnabled: 'true',
            relationDepth: '10',
            debug: 'true',
            zodImport: 'zod/v4',
          },
        },
      } as any as GeneratorOptions;

      const config = parseConfig(options);
      expect(config).toMatchObject({
        dateFormat: 'string',
        passthroughEnabled: true,
        relationDepth: 10,
        debug: true,
        zodImport: 'zod/v4',
      });
    });

    it('should handle ZODIPUS env vars for dry-run', () => {
      const originalEnv = process.env.ZODIPUS_DRY_RUN;
      process.env.ZODIPUS_DRY_RUN = 'true';

      const options = {
        generator: { config: {} },
      } as any as GeneratorOptions;

      const config = parseConfig(options);
      expect(config.dryRun).toBe(true);

      process.env.ZODIPUS_DRY_RUN = originalEnv;
    });
  });

  describe('extractCustomSchema', () => {
    it('should extract schema name from documentation', () => {
      expect(extractCustomSchema('/// @zodSchema UserSettingsSchema')).toBe('UserSettingsSchema');
      expect(extractCustomSchema('Some description\n@zodSchema PostMetadata')).toBe('PostMetadata');
    });

    it('should return null if no annotation found', () => {
      expect(extractCustomSchema('Just a description')).toBeNull();
      expect(extractCustomSchema(undefined)).toBeNull();
      expect(extractCustomSchema('')).toBeNull();
    });
  });

  describe('mapPrismaTypeToZod', () => {
    const defaultConfig = {
      dateFormat: 'coerce' as const,
      passthroughEnabled: false,
      relationDepth: 5,
      debug: false,
      zodImport: 'zod',
      dryRun: false,
    };

    it('should map basic scalar types', () => {
      const enumNames = new Set<string>();

      expect(mapPrismaTypeToZod({ type: 'String' } as any, enumNames, defaultConfig)).toBe(
        'z.string()'
      );
      expect(mapPrismaTypeToZod({ type: 'Int' } as any, enumNames, defaultConfig)).toBe(
        'z.number().int()'
      );
      expect(mapPrismaTypeToZod({ type: 'Boolean' } as any, enumNames, defaultConfig)).toBe(
        'z.boolean()'
      );
      expect(mapPrismaTypeToZod({ type: 'Float' } as any, enumNames, defaultConfig)).toBe(
        'z.number()'
      );
    });

    it('should map DateTime based on config', () => {
      const enumNames = new Set<string>();
      const field = { type: 'DateTime' } as any;

      expect(mapPrismaTypeToZod(field, enumNames, defaultConfig)).toBe('z.coerce.date()');
      expect(mapPrismaTypeToZod(field, enumNames, { ...defaultConfig, dateFormat: 'string' })).toBe(
        'z.string().datetime()'
      );
    });

    it('should map special Prisma types', () => {
      const enumNames = new Set<string>();

      expect(mapPrismaTypeToZod({ type: 'BigInt' } as any, enumNames, defaultConfig)).toBe(
        'z.bigint()'
      );
      expect(mapPrismaTypeToZod({ type: 'Decimal' } as any, enumNames, defaultConfig)).toContain(
        'z.union([z.number(), z.string()'
      );
      expect(mapPrismaTypeToZod({ type: 'Bytes' } as any, enumNames, defaultConfig)).toBe(
        'z.instanceof(Buffer)'
      );
    });

    it('should handle enums', () => {
      const enumNames = new Set(['UserRole']);
      expect(mapPrismaTypeToZod({ type: 'UserRole' } as any, enumNames, defaultConfig)).toBe(
        'UserRoleSchema'
      );
    });

    it('should handle JSON by returning a standard union', () => {
      const enumNames = new Set<string>();
      const field = { type: 'Json' } as any;

      const result = mapPrismaTypeToZod(field, enumNames, defaultConfig);
      expect(result).toContain('z.union([');
      expect(result).toContain('z.record(z.string(), z.unknown())');
      expect(result).toContain('z.array(z.unknown())');
    });

    it('should return z.unknown() for unsupported types', () => {
      const enumNames = new Set<string>();
      expect(mapPrismaTypeToZod({ type: 'Unsupported' } as any, enumNames, defaultConfig)).toBe(
        'z.unknown()'
      );
      expect(mapPrismaTypeToZod({ type: 'SomeRandomType' } as any, enumNames, defaultConfig)).toBe(
        'z.unknown()'
      );
    });
  });
});

describe('Generator Edge Cases', () => {
  describe('extractCustomSchema edge cases', () => {
    it('should handle multiple @zodSchema in documentation (takes first)', () => {
      const doc = '@zodSchema First @zodSchema Second';
      expect(extractCustomSchema(doc)).toBe('First');
    });

    it('should handle @zodSchema with extra whitespace', () => {
      expect(extractCustomSchema('@zodSchema   MySchema')).toBe('MySchema');
      expect(extractCustomSchema('  @zodSchema MySchema  ')).toBe('MySchema');
    });

    it('should not match partial annotations', () => {
      expect(extractCustomSchema('zodSchema NoAt')).toBeNull();
      expect(extractCustomSchema('@zodSchemaNoSpace')).toBeNull();
    });
  });

  describe('parseConfig edge cases', () => {
    it('should handle array config values', () => {
      const options = {
        generator: {
          config: {
            dateFormat: ['string', 'coerce'], // takes first
          },
        },
      } as any;

      const config = parseConfig(options);
      expect(config.dateFormat).toBe('string');
    });

    it('should handle invalid relationDepth (NaN)', () => {
      const options = {
        generator: {
          config: {
            relationDepth: 'not-a-number',
          },
        },
      } as any;

      const config = parseConfig(options);
      expect(Number.isNaN(config.relationDepth)).toBe(true);
    });
  });
});
