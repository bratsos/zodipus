# Query Engine Patterns

Advanced patterns and recipes for the Zodipus Query Engine.

## Table of Contents

1. [CRUD Operations](#crud-operations)
2. [Pagination](#pagination)
3. [Search and Filtering](#search-and-filtering)
4. [Aggregations](#aggregations)
5. [Transactions](#transactions)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Testing Patterns](#testing-patterns)

---

## CRUD Operations

### Create with Validation

```typescript
// Input schema (without auto-generated fields)
const CreateUserInput = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Create user
async function createUser(input: unknown) {
  const validated = CreateUserInput.parse(input);
  const user = await prisma.user.create({ data: validated });

  const query = userQuery({ select: { id: true, email: true, name: true } });
  return query.parse(user);
}
```

### Read with Query Engine

```typescript
// Get by ID
async function getUserById(id: string) {
  const query = userQuery({
    select: { id: true, email: true, name: true, role: true },
    posts: { select: { id: true, title: true } }
  });

  const user = await prisma.user.findUnique({
    ...query.query,
    where: { id },
  });

  return user ? query.parse(user) : null;
}

// List all
async function listUsers() {
  const query = userQuery({
    select: { id: true, email: true, name: true }
  });

  const users = await prisma.user.findMany(query.query);
  return query.array().parse(users);
}
```

### Update with Partial Validation

```typescript
// Update schema
const UpdateUserInput = UserSchema.pick({
  name: true,
  email: true,
}).partial();

async function updateUser(id: string, input: unknown) {
  const validated = UpdateUserInput.parse(input);

  const user = await prisma.user.update({
    where: { id },
    data: validated,
  });

  const query = userQuery({ select: { id: true, email: true, name: true } });
  return query.parse(user);
}
```

### Delete

```typescript
async function deleteUser(id: string) {
  const query = userQuery({ select: { id: true } });

  const user = await prisma.user.delete({
    ...query.query,
    where: { id },
  });

  return query.parse(user);
}
```

---

## Pagination

### Cursor-based Pagination

```typescript
interface PaginationParams {
  cursor?: string;
  take?: number;
}

async function paginateUsers({ cursor, take = 10 }: PaginationParams) {
  const query = userQuery({
    select: { id: true, email: true, name: true, createdAt: true }
  });

  const users = await prisma.user.findMany({
    ...query.query,
    take: take + 1, // Fetch one extra to check hasMore
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = users.length > take;
  const items = hasMore ? users.slice(0, -1) : users;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return {
    items: query.array().parse(items),
    nextCursor,
    hasMore,
  };
}
```

### Offset Pagination

```typescript
interface OffsetParams {
  page?: number;
  pageSize?: number;
}

async function paginateUsersOffset({ page = 1, pageSize = 20 }: OffsetParams) {
  const query = userQuery({
    select: { id: true, email: true, name: true }
  });

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      ...query.query,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count(),
  ]);

  return {
    items: query.array().parse(users),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

---

## Search and Filtering

### Full-text Search with Validation

```typescript
const SearchParams = z.object({
  q: z.string().min(1).max(100),
  role: RoleSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

async function searchUsers(params: unknown) {
  const { q, role, page, pageSize } = SearchParams.parse(params);

  const query = userQuery({
    select: { id: true, email: true, name: true, role: true }
  });

  const where = {
    AND: [
      {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      role ? { role } : {},
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      ...query.query,
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: query.array().parse(users),
    total,
    page,
    pageSize,
  };
}
```

### Dynamic Filters

```typescript
const FilterParams = z.object({
  role: RoleSchema.optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  hasPublishedPosts: z.boolean().optional(),
});

async function filterUsers(params: unknown) {
  const filters = FilterParams.parse(params);

  const query = userQuery({
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });

  const where: any = {};

  if (filters.role) where.role = filters.role;
  if (filters.createdAfter) where.createdAt = { gte: filters.createdAfter };
  if (filters.createdBefore) where.createdAt = { ...where.createdAt, lte: filters.createdBefore };
  if (filters.hasPublishedPosts) where.posts = { some: { published: true } };

  const users = await prisma.user.findMany({
    ...query.query,
    where,
  });

  return query.array().parse(users);
}
```

---

## Aggregations

### Count with Relations

```typescript
async function getUserStats(userId: string) {
  const [user, postCount, publishedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    }),
    prisma.post.count({ where: { authorId: userId } }),
    prisma.post.count({ where: { authorId: userId, published: true } }),
  ]);

  if (!user) return null;

  const query = userQuery({ select: { id: true, email: true, name: true } });

  return {
    ...query.parse(user),
    stats: {
      totalPosts: postCount,
      publishedPosts: publishedCount,
    },
  };
}
```

---

## Transactions

### Transaction with Validation

```typescript
async function transferOwnership(postId: string, newOwnerId: string) {
  const postQuery = postQuery({
    select: { id: true, title: true, authorId: true }
  });

  const result = await prisma.$transaction(async (tx) => {
    // Verify new owner exists
    const newOwner = await tx.user.findUnique({
      where: { id: newOwnerId },
      select: { id: true },
    });

    if (!newOwner) {
      throw new Error('New owner not found');
    }

    // Update post
    const post = await tx.post.update({
      ...postQuery.query,
      where: { id: postId },
      data: { authorId: newOwnerId },
    });

    return postQuery.parse(post);
  });

  return result;
}
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
import { ZodError } from 'zod';
import { ZodipusValidationError } from 'zodipus/errors';

async function safeGetUser(id: string) {
  const query = userQuery({
    select: { id: true, email: true, name: true }
  });

  try {
    const user = await prisma.user.findUnique({
      ...query.query,
      where: { id },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const validated = query.parse(user);
    return { success: true, data: validated };

  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.format(),
      };
    }

    if (error instanceof ZodipusValidationError) {
      return {
        success: false,
        error: 'Zodipus validation error',
        context: error.context,
      };
    }

    throw error; // Re-throw unexpected errors
  }
}
```

### Safe Parse Pattern

```typescript
async function getUserSafe(id: string) {
  const query = userQuery({
    select: { id: true, email: true, name: true }
  });

  const user = await prisma.user.findUnique({
    ...query.query,
    where: { id },
  });

  if (!user) return null;

  const result = query.safeParse(user);

  if (!result.success) {
    console.error('Validation failed:', result.error.format());
    return null;
  }

  return result.data;
}
```

---

## Performance Optimization

### Selective Loading

Only select what you need:

```typescript
// Slow: Loads all fields
const query = userQuery({ select: { /* all fields */ } });

// Fast: Loads only needed fields
const query = userQuery({ select: { id: true, email: true } });
```

### Batch Operations

```typescript
async function validateBatch(users: unknown[]) {
  const query = userQuery({ select: { id: true, email: true } });
  const schema = query.array();

  // Validate entire batch at once
  return schema.parse(users);
}
```

### Parallel Queries

```typescript
async function getDashboardData(userId: string) {
  const userQ = userQuery({ select: { id: true, name: true } });
  const postQ = postQuery({ select: { id: true, title: true } });

  const [user, recentPosts, draftPosts] = await Promise.all([
    prisma.user.findUnique({ ...userQ.query, where: { id: userId } }),
    prisma.post.findMany({
      ...postQ.query,
      where: { authorId: userId, published: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.findMany({
      ...postQ.query,
      where: { authorId: userId, published: false },
      take: 5,
    }),
  ]);

  return {
    user: user ? userQ.parse(user) : null,
    recentPosts: postQ.array().parse(recentPosts),
    draftPosts: postQ.array().parse(draftPosts),
  };
}
```

---

## Testing Patterns

### Unit Testing Queries

```typescript
import { describe, it, expect } from 'vitest';

describe('userQuery', () => {
  it('generates correct Prisma query', () => {
    const query = userQuery({
      select: { id: true, email: true },
      posts: { select: { title: true } }
    });

    expect(query.query).toEqual({
      select: {
        id: true,
        email: true,
        posts: { select: { title: true } }
      }
    });
  });

  it('validates correct data', () => {
    const query = userQuery({ select: { id: true, email: true } });

    const result = query.parse({
      id: '123',
      email: 'test@example.com',
    });

    expect(result).toEqual({
      id: '123',
      email: 'test@example.com',
    });
  });

  it('rejects invalid data', () => {
    const query = userQuery({ select: { id: true, email: true } });

    expect(() => query.parse({ id: '123' })).toThrow();
  });
});
```

### Integration Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from './test-client';

describe('User queries', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('creates and retrieves user with validation', async () => {
    const created = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Test' },
    });

    const query = userQuery({
      select: { id: true, email: true, name: true }
    });

    const user = await prisma.user.findUnique({
      ...query.query,
      where: { id: created.id },
    });

    const validated = query.parse(user);

    expect(validated.email).toBe('test@example.com');
    expect(validated.name).toBe('Test');
  });
});
```
