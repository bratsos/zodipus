# Testing Setup Guide

This guide explains how to set up and run tests for Zodipus.

## Prerequisites

- **Docker** and **Docker Compose** (for PostgreSQL)
- **Node.js** >=18.0.0
- **pnpm** >=8.0.0

## Quick Start

```bash
cd packages/zodipus

# Start the PostgreSQL test database
pnpm db:start

# Run database migrations
pnpm db:migrate

# Run all tests
pnpm test

# Stop the database when done
pnpm db:stop
```

## Test Database

Tests use a PostgreSQL database running in Docker. The configuration is in `docker-compose.yml`:

| Property | Value |
|----------|-------|
| Host | localhost |
| Port | 5433 |
| Database | zodipus_test |
| User | zodipus_test |
| Password | zodipus_test_password |

The connection string is:
```
postgresql://zodipus_test:zodipus_test_password@localhost:5433/zodipus_test?schema=public
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm db:start` | Start the PostgreSQL container |
| `pnpm db:stop` | Stop the PostgreSQL container |
| `pnpm db:reset` | Reset the database (removes all data) |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm test` | Run all tests once |
| `pnpm test:watch` | Run tests in watch mode |

## Test Structure

```
packages/zodipus/src/
├── generator.test.ts       # Generator snapshot tests
├── generator.unit.test.ts  # Generator unit tests
├── queryEngine.test.ts     # Query Engine integration tests
└── cli.test.ts             # CLI integration tests
```

### Test Types

1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test with real database operations
3. **Snapshot Tests** - Verify generated output consistency

## Running Specific Tests

```bash
# Run a specific test file
pnpm test generator.test.ts

# Run tests matching a pattern
pnpm test -t "mapPrismaTypeToZod"

# Run with coverage
pnpm test --coverage
```

## Troubleshooting

### Database Connection Failed

If tests fail with connection errors:

1. Check if Docker is running
2. Verify the database container is up:
   ```bash
   docker ps | grep zodipus
   ```
3. Reset the database:
   ```bash
   pnpm db:reset
   pnpm db:migrate
   ```

### Port Already in Use

If port 5433 is already in use:

1. Stop other containers using the port:
   ```bash
   docker stop $(docker ps -q --filter "publish=5433")
   ```
2. Or modify `docker-compose.yml` to use a different port

### Migrations Failed

If migrations fail:

1. Reset the database:
   ```bash
   pnpm db:reset
   ```
2. Re-run migrations:
   ```bash
   pnpm db:migrate
   ```

## CI Environment

In CI (GitHub Actions), the PostgreSQL service is configured automatically. See `.github/workflows/ci.yml` for the configuration.

The CI uses the same database credentials but connects via the service container instead of localhost.
