/**
 * Prisma Types vs Zod Types - Type Incompatibility Example
 *
 * This file demonstrates why Prisma types and Zod types are INCOMPATIBLE,
 * particularly for:
 * - JSON fields: Prisma uses generic `JsonValue`, Zod defines specific structures
 * - Enums: Prisma uses `$Enums.UserRole`, Zod uses literal unions
 *
 * Run with: pnpm dlx ts-node src/type-comparison.ts
 */

import { PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import { models } from './generated/generated-index';

const prisma = new PrismaClient();

// ============================================
// Type definitions
// ============================================

// Zod-inferred type - has SPECIFIC types for JSON fields and enums
type ValidatedUser = z.infer<typeof models.UserSchema>;
// This type has:
// - settings: { theme: 'light' | 'dark' | 'auto', ... } | null | undefined
// - role: 'USER' | 'ADMIN' | 'MODERATOR'

// ============================================
// Example function expecting validated data
// ============================================

function processValidatedUser(user: ValidatedUser): void {
  console.log('Processing validated user:');
  console.log('  - ID:', user.id);
  console.log('  - Email:', user.email);
  console.log('  - Role:', user.role);
  console.log('  - Settings theme:', user.settings?.theme);
}

// ============================================
// Demonstration
// ============================================

async function main() {
  console.log('🔍 Prisma Types vs. Zod Types Comparison\n');

  // ------------------------------------------
  // Scenario 1: Using Prisma result directly
  // ------------------------------------------
  console.log('📋 Scenario 1: Prisma result (incompatible types)\n');

  const prismaUser = await prisma.user.findFirst();
  
  if (prismaUser) {
    console.log('Prisma returned a user:', prismaUser.email);
    console.log('Prisma type has:');
    console.log('  - settings: JsonValue (generic)');
    console.log('  - role: $Enums.UserRole\n');
    
    // 🔴 TypeScript ERROR - Types are incompatible:
    // 
    // Argument of type '{ settings: JsonValue, role: $Enums.UserRole, ... }'
    // is not assignable to parameter of type '{ settings: { theme?: "light" | "dark" | ... }, role: "USER" | "ADMIN" | ... }'
    //
    // - Type 'JsonValue' is not assignable to type '{ theme?: "light" | "dark" | ... }'
    // - Type '$Enums.UserRole' is not assignable to type '"USER" | "ADMIN" | "MODERATOR"'
    
    processValidatedUser(prismaUser); // ❌ TypeScript error here!
    
  } else {
    console.log('  No user found. Create one first.\n');
  }

  // ------------------------------------------
  // Scenario 2: With Zod validation (solution)
  // ------------------------------------------
  console.log('📋 Scenario 2: With Zod validation\n');

  const prismaUser2 = await prisma.user.findFirst();
  
  if (prismaUser2) {
    // ✅ SOLUTION: Parse through Zod for runtime validation
    // This converts JsonValue → specific type AND validates the data
    const validatedUser = models.UserSchema.parse(prismaUser2);
    
    // Now we can safely pass to functions expecting validated data
    processValidatedUser(validatedUser); // ✅ Types match!
    
    console.log('\n  ✅ Data is validated and types are compatible!\n');
  }

  // ------------------------------------------
  // Key Takeaway
  // ------------------------------------------
  console.log('📝 Key Takeaway:');
  console.log('   Prisma types use generic JsonValue and $Enums.* types');
  console.log('   Zod schemas define specific structures with literal unions');
  console.log('   These are INCOMPATIBLE - you must parse through Zod to convert');
  console.log('   Zodipus Query Engine does this automatically for you!\n');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
