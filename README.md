# Zodipus

[![npm version](https://badge.fury.io/js/zodipus.svg)](https://badge.fury.io/js/zodipus)

> **Zodipus: solves your schema tragedies.**

*Zod + Oedipus = Zodipus*

A powerful Prisma generator that creates clean, type-safe Zod schemas and a **Query Engine** for composable, runtime-validated queries.

## The Problem

Prisma and Zod generate **incompatible types**, especially for JSON fields and enums:

```typescript
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

Zodipus provides a **Query Engine** that creates composable Prisma queries with automatic Zod validation:

```typescript
import { createRegistry } from 'zodipus/queryEngine';
import { models, modelRelations } from './generated/generated-index';

// Create registry and query builders
const registry = createRegistry({ models, relations: modelRelations });
const userQuery = registry.createQuery('user');

// Build a query with relations
const query = userQuery({
  select: { id: true, email: true, name: true },
  posts: {
    select: { title: true, published: true },
  },
});

// Execute with Prisma
const users = await prisma.user.findMany(query.query);

// ✅ Validate and get properly typed results
const validatedUsers = query.array().parse(users);
// Type: { id: string, email: string, name: string | null, posts: { title: string, published: boolean }[] }[]

// Now you can safely pass to functions expecting validated data
processUsers(validatedUsers); // ✅ Works!
```

## Quick Start

```bash
pnpm add -D zodipus
```

Add to your Prisma schema:

```prisma
generator zodipus {
  provider      = "zodipus"
  output        = "./generated"
  relationDepth = "5"
}
```

Then run:

```bash
pnpm prisma generate
```

## Features

See [packages/zodipus/README.md](packages/zodipus/README.md) for complete documentation.


## Development Setup

This project uses `pnpm` as a package manager and `Docker Compose` for local database development.

### Prerequisites

- Node.js v23.10.0 or higher
- pnpm 8.15.0 or higher
- Docker and Docker Compose

### Installation

```bash
git clone https://github.com/bratsos/zodipus.git
cd zodipus
pnpm install
```

### Running Tests

Refer to [packages/zodipus/TESTING_SETUP.md](packages/zodipus/TESTING_SETUP.md) for detailed instructions on setting up and running tests with Docker Compose.

### Running Examples

Refer to [examples/basic-usage/README.md](examples/basic-usage/README.md) for detailed instructions on setting up and running the basic usage example with Docker Compose.
