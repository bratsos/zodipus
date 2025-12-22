import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * CLI Integration Tests
 *
 * These tests verify CLI commands work correctly.
 * They run actual CLI commands but mock/skip intensive operations where possible.
 */

const CLI_PATH = resolve(__dirname, '../dist/cli.cjs');
// Test fixtures path for future use
const _FIXTURES_DIR = resolve(__dirname, '../prisma');
const _TEST_SCHEMA = resolve(_FIXTURES_DIR, 'schema.prisma');

function runCLI(
  args: string[],
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env, ...env },
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });

    child.on('error', (err) => {
      stderr += err.message;
      resolve({ stdout, stderr, code: 1 });
    });
  });
}

describe('CLI Tests', () => {
  beforeEach(() => {
    // Ensure CLI is built
    if (!existsSync(CLI_PATH)) {
      throw new Error(`CLI not built. Run 'pnpm build' first. Expected: ${CLI_PATH}`);
    }
  });

  describe('help command', () => {
    it('should show help with --help flag', async () => {
      const { stdout, code } = await runCLI(['--help']);
      expect(code).toBe(0);
      expect(stdout).toContain('zodipus');
      expect(stdout).toContain('solves your schema tragedies');
    });

    it('should show version with --version flag', async () => {
      const { stdout, code } = await runCLI(['--version']);
      expect(code).toBe(0);
      expect(stdout).toContain('0.1.0');
    });
  });

  describe('inspect command', () => {
    it('should show help for inspect subcommand', async () => {
      const { stdout, code } = await runCLI(['inspect', '--help']);
      expect(code).toBe(0);
      expect(stdout).toContain('Inspect a Prisma schema');
      expect(stdout).toContain('--models');
      expect(stdout).toContain('--enums');
      expect(stdout).toContain('--relations');
    });

    it('should fail with invalid schema path', async () => {
      const { code } = await runCLI(['inspect', 'non-existent-schema.prisma']);
      expect(code).not.toBe(0);
    }, 15000); // Increased timeout for Prisma CLI execution
  });

  describe('generate command', () => {
    it('should show help for generate subcommand', async () => {
      const { stdout, code } = await runCLI(['generate', '--help']);
      expect(code).toBe(0);
      expect(stdout).toContain('Generate Zod schemas');
      expect(stdout).toContain('--dry-run');
    });

    it('should fail with invalid schema path', async () => {
      const { code } = await runCLI(['generate', 'non-existent-schema.prisma']);
      expect(code).not.toBe(0);
    }, 15000);
  });

  describe('invalid commands', () => {
    it('should show error for unknown commands', async () => {
      const { code } = await runCLI(['unknown-command']);
      // Commander shows help or error for unknown commands
      expect(code).not.toBe(0);
    });
  });
});
