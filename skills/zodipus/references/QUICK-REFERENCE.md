# Zodipus Quick Reference

## Installation

```bash
npm install zodipus zod
# or
pnpm add zodipus zod
# or
yarn add zodipus zod
```

## Generator Configuration

```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./generated"      # Required: output directory
  relationDepth      = "5"                # Max nesting depth (default: 5)
  dateFormat         = "coerce"           # "coerce" | "string" (default: coerce)
  passthroughEnabled = "false"            # Allow extra keys (default: false)
  debug              = "false"            # Verbose logging (default: false)
}
```

## Schema Imports

```typescript
// Individual schemas
import { UserSchema, PostSchema, RoleSchema } from './generated';

// All models and relations (for Query Engine)
import { models, modelRelations } from './generated/generated-index';

// Type inference
import { z } from 'zod';
type User = z.infer<typeof UserSchema>;
```

## Basic Validation

```typescript
// Parse (throws on error)
const user = UserSchema.parse(data);

// Safe parse (returns result object)
const result = UserSchema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.format());
}

// Partial validation (for PATCH endpoints)
const PartialUserSchema = UserSchema.partial();
const updates = PartialUserSchema.parse({ name: 'New Name' });

// Array validation
const users = UserSchema.array().parse(dataArray);
```

## Query Engine Setup

```typescript
import { createRegistry } from 'zodipus/queryEngine';
import { models, modelRelations } from './generated/generated-index';

const registry = createRegistry({
  models,
  relations: modelRelations,
});

// Create query builders for each model
const userQuery = registry.createQuery('user');
const postQuery = registry.createQuery('post');
```

## Query Patterns

### Select Specific Fields
```typescript
const query = userQuery({
  select: { id: true, email: true, name: true }
});

const user = await prisma.user.findFirst(query.query);
const validated = query.parse(user);
// Type: { id: string; email: string; name: string | null }
```

### Include Relations
```typescript
const query = userQuery({
  select: { id: true, email: true },
  posts: {
    select: { id: true, title: true, published: true }
  }
});

const users = await prisma.user.findMany(query.query);
const validated = query.array().parse(users);
// Type: { id: string; email: string; posts: { id: string; title: string; published: boolean }[] }[]
```

### Nested Relations
```typescript
const query = userQuery({
  select: { id: true },
  posts: {
    select: { title: true },
    comments: {
      select: { content: true, author: { select: { name: true } } }
    }
  }
});
```

### Safe Parsing
```typescript
const result = query.safeParse(data);
if (result.success) {
  // result.data is typed
} else {
  // result.error is ZodError
  console.error(result.error.issues);
}
```

### Partial Queries
```typescript
const partialQuery = query.partial();
const updates = partialQuery.parse({ name: 'Updated' });
```

## Custom JSON Schemas

### Step 1: Annotate in Prisma
```prisma
model Post {
  id       String @id
  /// @zodSchema PostMetadataSchema
  metadata Json?
}
```

### Step 2: Define in custom-schemas.ts
```typescript
// generated/custom-schemas.ts
import { z } from 'zod';

export const PostMetadataSchema = z.object({
  tags: z.array(z.string()),
  views: z.number().default(0),
  featured: z.boolean().optional(),
});
```

## CLI Commands

```bash
# Inspect schema structure
npx zodipus inspect prisma/schema.prisma --models
npx zodipus inspect prisma/schema.prisma --enums
npx zodipus inspect prisma/schema.prisma --relations
npx zodipus inspect prisma/schema.prisma --json

# Generate (usually via prisma generate)
npx zodipus generate prisma/schema.prisma
npx zodipus generate prisma/schema.prisma --dry-run
```

## Error Handling

```typescript
import { ZodipusValidationError } from 'zodipus/errors';

try {
  const user = UserSchema.parse(invalidData);
} catch (error) {
  if (error instanceof ZodipusValidationError) {
    console.error('Validation failed:', error.context);
  }
}
```

## Common Configurations

### Strict API Validation
```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./generated"
  passthroughEnabled = "false"
  dateFormat         = "string"
}
```

### Flexible Data Pipeline
```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./generated"
  passthroughEnabled = "true"
  dateFormat         = "coerce"
}
```

### Deep Nested Relations
```prisma
generator zodipus {
  provider      = "zodipus"
  output        = "./generated"
  relationDepth = "10"
}
```
