# Zodipus

> **Zodipus: solves your schema tragedies.**

A powerful Prisma generator that automatically creates:
1. **Clean Zod model schemas** (without relations) from your Prisma schema
2. **Enum schemas** with TypeScript types
3. **Relation metadata** for query engines and GraphQL resolvers
4. **Custom schema support** for complex JSON fields
5. **Query Engine** for composable, runtime-validated Prisma queries

## The Problem: Prisma Types vs. Zod Types

Prisma and Zod generate **incompatible types**, especially for JSON fields and enums:

```typescript
import { z } from 'zod';

const user = await prisma.user.findFirst();
// Prisma type: { settings: JsonValue, role: $Enums.UserRole, ... }

function processUser(data: z.infer<typeof UserSchema>) {
  // Zod type: { settings: { theme: 'light' | 'dark', ... }, role: 'USER' | 'ADMIN', ... }
}

// ❌ TypeScript ERROR:
// Type 'JsonValue' is not assignable to type '{ theme?: "light" | "dark" | ... }'
// Type '$Enums.UserRole' is not assignable to type '"USER" | "ADMIN" | "MODERATOR"'
processUser(user);
```

**Why types are incompatible:**
- **JSON fields**: Prisma uses generic `JsonValue`, but Zod schemas (via `@zodSchema`) define specific structures
- **Enums**: Prisma generates `$Enums.UserRole`, while Zod uses literal unions `"USER" | "ADMIN"`
- **Runtime validation**: Even if types matched, Prisma data is not validated — malformed JSON or invalid values can slip through

## The Solution: Query Engine

Zodipus's **Query Engine** creates composable Prisma queries that automatically validate results:

```typescript
import { createRegistry } from 'zodipus/queryEngine';
import { models, modelRelations } from './generated/generated-index';

const registry = createRegistry({ models, relations: modelRelations });
const userQuery = registry.createQuery('user');

// Build a type-safe query with relations
const query = userQuery({
  select: { id: true, email: true, name: true },
  posts: { select: { title: true, published: true } },
});

// Execute with Prisma
const users = await prisma.user.findMany(query.query);

// ✅ Validate and get properly typed results
const validatedUsers = query.array().parse(users);
// Type: { id: string, email: string, name: string | null, posts: { title: string, published: boolean }[] }[]

// Now safely pass to functions expecting validated data
processUsers(validatedUsers); // ✅ Guaranteed valid!
```



## Installation

```bash
# Using npm
npm install -D zodipus

# Using yarn
yarn add -D zodipus

# Using pnpm
pnpm add -D zodipus
```

## Quick Start

### 1. Add generator to your Prisma schema

```prisma
generator zodipus {
  provider      = "zodipus"
  output        = "./generated"
  relationDepth = "5"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  role      Role
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  
  /// @zodSchema PostMetadataSchema
  metadata  Json?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Run Prisma generate

```bash
pnpm prisma generate
```

### 3. Use generated schemas

```typescript
import { UserSchema, RoleSchema, PostSchema } from './generated';

// Parse and validate data
const user = UserSchema.parse({
  id: '123',
  email: 'user@example.com',
  role: 'ADMIN',
  createdAt: new Date(),
  updatedAt: new Date()
});

// Use enums
const role = RoleSchema.parse('ADMIN');
```

## Features

### Clean Zod Schemas

Generate schemas containing only scalar fields - no relation clutter:

```typescript
export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional().nullable(),
  role: RoleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
```

### Custom JSON Field Schemas

Add type-safe validation for JSON fields using `@zodSchema` annotations:

```prisma
model Post {
  /// @zodSchema PostMetadataSchema
  metadata Json?
}
```

Then define in `generated/custom-schemas.ts`:

```typescript
export const PostMetadataSchema = z.object({
  tags: z.array(z.string()),
  views: z.number(),
  featured: z.boolean().optional(),
});
```

### Relation Metadata

Extracted automatically for building query engines:

```typescript
const relations = {
  user: {
    posts: {
      type: "post" as const,
      isArray: true,
      relations: { /* nested */ }
    }
  }
} as const;
```

## Query Engine Integration

Zodipus includes a powerful Query Engine that works seamlessly with your generated schemas:

```typescript
import { createRegistry } from 'zodipus/queryEngine';
import { models, modelRelations } from './generated/generated-index';

// Create registry
const registry = createRegistry({
  models,
  relations: modelRelations,
});

// Create query builders
export const userQuery = registry.createQuery('user');
export const postQuery = registry.createQuery('post');

// Use with Prisma
const query = userQuery({
  select: { id: true, email: true, name: true },
  posts: {
    select: { title: true, published: true },
  },
});

// Execute and validate
const users = await prisma.user.findMany(query.query);
const validated = query.array().parse(users);
```

**Features:**
- ✅ Complete compile-time type safety
- ✅ Runtime validation with Zod
- ✅ Automatic relation handling
- ✅ Nested query support
- ✅ Selective validation for performance

See [Query Engine Documentation](./queryEngine.md) for complete API reference and examples.

## Configuration

Add options to your Prisma generator configuration:

```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./generated"
  relationDepth      = "5"
  dateFormat         = "coerce"    // or "string"
  passthroughEnabled = "false"     // or "true"
  debug              = "false"     // or "true"
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | string | Required | Set to `"zodipus"` |
| `output` | string | Required | Output directory for generated files |
| `relationDepth` | string | `"5"` | Maximum depth for nested relations |
| `dateFormat` | string | `"coerce"` | DateTime handling: `"coerce"` uses `z.coerce.date()`, `"string"` uses `z.string().datetime()` |
| `passthroughEnabled` | string | `"false"` | When `"true"`, objects allow extra keys (passthrough mode). When `"false"` (default), unknown keys are stripped. |
| `debug` | string | `"false"` | Enable debug logging during generation |

### DateTime Format

Choose how DateTime fields are validated:

- **`coerce` (default)**: Uses `z.coerce.date()` - accepts Date objects, ISO strings, and timestamps
- **`string`**: Uses `z.string().datetime()` - only accepts ISO 8601 datetime strings

```prisma
// dateFormat = "coerce" (default)
generator zodipus {
  dateFormat = "coerce"
}
// Generates: createdAt: z.coerce.date()

// dateFormat = "string"
generator zodipus {
  dateFormat = "string"
}
// Generates: createdAt: z.string().datetime()
```

### Passthrough Mode

Control how objects handle extra properties:

- **`false` (default)**: Strict mode - unknown keys are stripped during parsing
- **`true`**: Passthrough mode - unknown keys are preserved

```prisma
// passthroughEnabled = "false" (default)
generator zodipus {
  passthroughEnabled = "false"
}
// Generates: z.object({ ... })

// passthroughEnabled = "true"
generator zodipus {
  passthroughEnabled = "true"
}
// Generates: z.object({ ... }).passthrough()
```

## Generated Files

```
generated/
├── enums.ts              # Prisma enums as Zod schemas
├── models.ts             # Clean model schemas
├── custom-schemas.ts     # Custom JSON field schemas
├── generated-relations.ts # Relation metadata
└── generated-index.ts    # Exports
```

## Examples

### API Validation

```typescript
import { UserSchema } from './generated';

app.post('/users', (req, res) => {
  const user = UserSchema.parse(req.body);
  await db.user.create({ data: user });
});
```

### Partial Updates

```typescript
const UpdateUserSchema = UserSchema.partial();
const updates = UpdateUserSchema.parse(req.body);
```

## API Reference

### Main Exports (`zodipus`)

| Export | Type | Description |
|--------|------|-------------|
| `createRegistry` | Function | Creates a query registry for type-safe Prisma queries |

### Query Engine (`zodipus/queryEngine`)

| Export | Type | Description |
|--------|------|-------------|
| `createRegistry(config)` | Function | Creates query registry with models and relations |
| `ModelRegistry` | Type | Generic type for model schema map |
| `ModelRelations` | Type | Generic type for relation metadata |
| `RelationConfig` | Type | Configuration for a single relation |
| `QueryExecutor` | Type | Return type of query builders |
| `SafeParseResult<T>` | Type | Result of `.safeParse()` operations |

#### `createRegistry(config)`

```typescript
function createRegistry<TModels, TRelations>(config: {
  models: TModels;
  relations: TRelations;
}): {
  createQuery: (model: keyof TModels) => QueryBuilder;
};
```

#### `QueryExecutor`

```typescript
interface QueryExecutor<T> {
  query: { select: ... } | { include: ... };  // Pass to Prisma
  parse(data: unknown): T;                     // Throws on invalid
  safeParse(data: unknown): SafeParseResult<T>; // Returns {success, data/error}
  array(): {
    parse(data: unknown[]): T[];
    safeParse(data: unknown[]): SafeParseResult<T[]>;
  };
}
```

### Errors (`zodipus/errors`)

| Export | Type | Description |
|--------|------|-------------|
| `ZodipusError` | Class | Base error class |
| `ZodipusValidationError` | Class | Thrown when validation fails |
| `ZodipusGeneratorError` | Class | Thrown during schema generation |
| `ValidationErrorContext` | Type | Context included in validation errors |

#### `ZodipusValidationError`

```typescript
class ZodipusValidationError extends ZodipusError {
  context: {
    model: string;      // Model being validated
    field?: string;     // Field that failed
    expected?: string;  // Expected type/value
    received?: string;  // Received type/value
    path?: (string | number)[];  // Path to field
  };
}
```

### Generated Files

| File | Exports |
|------|---------|
| `models.ts` | `UserSchema`, `PostSchema`, etc. (Zod schemas for each model) |
| `enums.ts` | `RoleSchema`, `StatusSchema`, etc. (Zod schemas for enums) |
| `generated-relations.ts` | `modelRelations` (relation metadata for Query Engine) |
| `generated-index.ts` | Re-exports all above + `models` namespace |
| `custom-schemas.ts` | Your custom JSON field schemas (created once, not overwritten) |

### CLI

```bash
# Inspect schema structure
zodipus inspect <schema.prisma> [--models] [--enums] [--relations] [--json]

# Generate with dry-run
zodipus generate <schema.prisma> [--dry-run]
```
