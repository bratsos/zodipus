#!/usr/bin/env node
/**
 * Zodipus CLI
 *
 * Command-line interface for schema inspection and generation.
 * Wraps `prisma generate` with special environment variables to trigger
 * inspection or dry-run modes within the native generator execution.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { Command } from 'commander';

const program = new Command();

program.name('zodipus').description('Zodipus: solves your schema tragedies').version('0.1.0');

/**
 * Execute prisma generate with custom env vars
 */
function runPrismaGenerate(schemaPath: string, env: Record<string, string>): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const resolvedPath = resolve(process.cwd(), schemaPath);
    console.log('\n🚀 Running Zodipus via Prisma Generator...');
    console.log(`📄 Schema: ${resolvedPath}\n`);

    const child = spawn(
      'pnpm dlx',
      [
        'prisma',
        'generate',
        '--schema',
        resolvedPath,
        '--generator',
        'zodipus', // Only run our generator
      ],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ...env,
        },
        shell: true,
      }
    );

    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`Prisma generate failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Inspect command - shows models, enums, and relations from a Prisma schema
 */
program
  .command('inspect')
  .description('Inspect a Prisma schema and show its structure')
  .argument('<schema>', 'Path to the Prisma schema file')
  .option('-m, --models', 'Show only models')
  .option('-e, --enums', 'Show only enums')
  .option('-r, --relations', 'Show only relations')
  .option('--json', 'Output as JSON')
  .action(async (schemaPath: string, options) => {
    const flags: string[] = [];
    if (options.models) flags.push('models');
    if (options.enums) flags.push('enums');
    if (options.relations) flags.push('relations');

    try {
      await runPrismaGenerate(schemaPath, {
        ZODIPUS_CMD: 'inspect',
        ZODIPUS_INSPECT_FLAGS: flags.join(','),
        ZODIPUS_INSPECT_JSON: options.json ? 'true' : 'false',
      });
    } catch (error) {
      console.error('\n❌ Inspect failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Generate command with --dry-run support
 */
program
  .command('generate')
  .description('Generate Zod schemas from a Prisma schema')
  .argument('<schema>', 'Path to the Prisma schema file')
  .option('-o, --output <dir>', 'Output directory (defaults to schema config)')
  .option('--dry-run', 'Preview output without writing files')
  .action(async (schemaPath: string, options) => {
    try {
      if (options.output) {
        console.warn(
          '⚠️ Note: --output flag is currently ignored by the wrapper. Configure output in your schema.prisma file.'
        );
      }

      await runPrismaGenerate(schemaPath, {
        ZODIPUS_CMD: 'generate',
        ZODIPUS_DRY_RUN: options.dryRun ? 'true' : 'false',
      });
    } catch (error) {
      console.error('\n❌ Generation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
