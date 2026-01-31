# Generator Options Reference

Complete documentation for all Zodipus generator configuration options.

## Required Options

### `provider`

**Type:** `string`
**Required:** Yes

Must be set to `"zodipus"` to enable the generator.

```prisma
generator zodipus {
  provider = "zodipus"
}
```

### `output`

**Type:** `string`
**Required:** Yes

Directory path where generated files will be written. Can be absolute or relative to the schema file.

```prisma
generator zodipus {
  provider = "zodipus"
  output   = "./generated"           # Relative to schema.prisma
  output   = "./src/lib/zodipus"     # Nested path
  output   = "/absolute/path/gen"    # Absolute path
}
```

**Generated files:**
- `enums.ts` - Enum schemas
- `models.ts` - Model schemas (no relations)
- `custom-schemas.ts` - Placeholder for @zodSchema
- `generated-relations.ts` - Relation metadata
- `generated-index.ts` - Re-exports

---

## Optional Options

### `relationDepth`

**Type:** `string` (number as string)
**Default:** `"5"`

Maximum depth for extracting nested relation metadata. Affects the Query Engine's ability to build deeply nested queries.

```prisma
generator zodipus {
  provider      = "zodipus"
  output        = "./generated"
  relationDepth = "5"   # Default - 5 levels deep
  relationDepth = "10"  # Deep nesting
  relationDepth = "1"   # Shallow - direct relations only
}
```

**Examples of depth:**
- Depth 1: `User.posts`
- Depth 2: `User.posts.comments`
- Depth 3: `User.posts.comments.author`
- Depth 4: `User.posts.comments.author.profile`
- Depth 5: `User.posts.comments.author.profile.settings`

**Performance note:** Higher depth increases generation time slightly but doesn't affect runtime performance.

---

### `dateFormat`

**Type:** `string`
**Default:** `"coerce"`
**Values:** `"coerce"` | `"string"`

Controls how DateTime fields are validated.

#### `"coerce"` (Default)

Uses `z.coerce.date()`. Accepts and converts:
- Date objects
- ISO 8601 strings
- Unix timestamps (milliseconds)
- Any value parseable by `new Date()`

```typescript
// All valid with dateFormat = "coerce"
UserSchema.parse({ createdAt: new Date() });
UserSchema.parse({ createdAt: '2024-01-15T10:30:00Z' });
UserSchema.parse({ createdAt: 1705315800000 });
UserSchema.parse({ createdAt: 'January 15, 2024' });
```

**Best for:**
- APIs receiving dates from various sources
- Database results (Prisma returns Date objects)
- User input from forms
- JSON payloads with string dates

#### `"string"`

Uses `z.string().datetime()`. Only accepts ISO 8601 format:

```typescript
// Valid with dateFormat = "string"
UserSchema.parse({ createdAt: '2024-01-15T10:30:00.000Z' });

// Invalid - throws ZodError
UserSchema.parse({ createdAt: new Date() });           // Error: expected string
UserSchema.parse({ createdAt: 1705315800000 });        // Error: expected string
UserSchema.parse({ createdAt: '01/15/2024' });         // Error: invalid datetime
```

**Best for:**
- Strict API contracts
- OpenAPI/Swagger compatibility
- When you need consistent date format everywhere

---

### `passthroughEnabled`

**Type:** `string`
**Default:** `"false"`
**Values:** `"true"` | `"false"`

Controls handling of unknown/extra keys in objects.

#### `"false"` (Default)

Uses `z.object().strict()` behavior. Unknown keys are stripped:

```typescript
const data = {
  id: '123',
  email: 'user@example.com',
  name: 'John',
  unknownField: 'this will be removed',
  anotherExtra: 42
};

const user = UserSchema.parse(data);
// user = { id: '123', email: 'user@example.com', name: 'John' }
// unknownField and anotherExtra are removed
```

**Best for:**
- API input validation (security)
- Preventing data leakage
- Strict type contracts

#### `"true"`

Uses `z.object().passthrough()`. Unknown keys are preserved:

```typescript
const data = {
  id: '123',
  email: 'user@example.com',
  name: 'John',
  customField: 'preserved',
  metadata: { extra: true }
};

const user = UserSchema.parse(data);
// user = { id: '123', email: 'user@example.com', name: 'John',
//          customField: 'preserved', metadata: { extra: true } }
```

**Best for:**
- Data transformation pipelines
- ETL processes
- When you need to pass through extra data
- Middleware that adds fields

---

### `debug`

**Type:** `string`
**Default:** `"false"`
**Values:** `"true"` | `"false"`

Enables verbose debug logging during generation.

```prisma
generator zodipus {
  provider = "zodipus"
  output   = "./generated"
  debug    = "true"
}
```

**Output includes:**
- Model processing details
- Field type mappings
- Relation extraction steps
- File write operations
- Configuration values

**Use when:**
- Debugging generation issues
- Understanding what Zodipus is doing
- Filing bug reports

---

### `zodImport`

**Type:** `string`
**Default:** `"zod"`

Custom import path for Zod. Useful for custom Zod builds or monorepo setups.

```prisma
generator zodipus {
  provider  = "zodipus"
  output    = "./generated"
  zodImport = "zod"              # Default
  zodImport = "@acme/zod"        # Custom package
  zodImport = "../../lib/zod"    # Relative path
}
```

**Generated import:**
```typescript
import { z } from 'zod';           // Default
import { z } from '@acme/zod';     // Custom
import { z } from '../../lib/zod'; // Relative
```

---

## Environment Variables

These environment variables affect CLI behavior:

| Variable | Description |
|----------|-------------|
| `ZODIPUS_CMD` | Set to `inspect` for inspect mode |
| `ZODIPUS_INSPECT_FLAGS` | Flags: `models`, `enums`, `relations` |
| `ZODIPUS_INSPECT_JSON` | Set to `true` for JSON output |
| `ZODIPUS_DRY_RUN` | Set to `true` for dry-run mode |

---

## Configuration Recipes

### Strict Production API
```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./src/generated/zodipus"
  relationDepth      = "5"
  dateFormat         = "string"
  passthroughEnabled = "false"
  debug              = "false"
}
```

### Development/Debug Mode
```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./generated"
  relationDepth      = "10"
  dateFormat         = "coerce"
  passthroughEnabled = "true"
  debug              = "true"
}
```

### GraphQL Backend
```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./src/graphql/generated"
  relationDepth      = "8"
  dateFormat         = "string"
  passthroughEnabled = "false"
}
```

### Data Migration Tool
```prisma
generator zodipus {
  provider           = "zodipus"
  output             = "./migrations/schemas"
  relationDepth      = "3"
  dateFormat         = "coerce"
  passthroughEnabled = "true"
}
```
