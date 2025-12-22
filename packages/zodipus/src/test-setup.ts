import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll } from 'vitest';
import { cleanupTestData, seedTestData, setPrismaInstance } from './seed-data';

export let prisma: PrismaClient;

export async function setupTestDatabase() {
  console.log('🚀 Setting up test database...');

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please ensure Docker Compose is running and .env.test is configured correctly.'
    );
  }

  try {
    console.log('📦 Pushing Prisma schema to database...');
    // Pass DATABASE_URL inline to override any .env file that Prisma might load
    // Remove any surrounding quotes that might be in the env var
    const dbUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '') || '';
    execSync(`DATABASE_URL='${dbUrl}' pnpm exec prisma db push --skip-generate`, {
      stdio: 'inherit',
      shell: '/bin/sh',
    });
    console.log('✅ Schema pushed to database.');

    // Clean the URL for PrismaClient as well
    const clientUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '') || '';
    console.log(`📝 Connecting to database: ${clientUrl}`);
    prisma = new PrismaClient({
      datasourceUrl: clientUrl,
    });
    await prisma.$connect();
    console.log('✅ Prisma Client connected to the database.');

    setPrismaInstance(prisma);

    console.log('🌱 Seeding test data...');
    const seedStart = Date.now();
    await seedTestData();
    console.log(`✅ Test data seeded (took ${Date.now() - seedStart}ms)`);

    console.log('🎉 Database setup complete! Ready for tests.');
  } catch (error) {
    console.error('❌ Error during database setup:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.log('🧹 Cleaning up after setup error...');
    await teardownTestDatabase();
    throw error;
  }

  return { prisma };
}

/**
 * Clean up test database
 * This runs after all tests
 */
export async function teardownTestDatabase() {
  console.log('🧹 Starting teardown...');

  if (prisma) {
    try {
      await cleanupTestData();
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }

    try {
      await prisma.$disconnect();
      console.log('✅ Prisma disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting Prisma:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }
  }

  console.log('✅ Teardown complete');
}

/**
 * Setup/teardown hooks for Vitest
 * Import these in your test files
 */
export function setupTestHooks() {
  beforeAll(async () => {
    await setupTestDatabase();
  }, 60000); // 60 second timeout for database setup

  afterAll(async () => {
    await teardownTestDatabase();
  }, 15000); // 15 second timeout for teardown
}
