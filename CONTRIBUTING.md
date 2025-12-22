# Contributing to Zodipus

> **Thank you for your interest in contributing to Zodipus!** 🎉

We welcome contributions of all kinds: bug reports, feature requests, documentation improvements, and code contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)

## Code of Conduct

By participating in this project, you agree to maintain a welcoming and inclusive environment for everyone. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** >=18.0.0
- **pnpm** >=8.0.0 (we use pnpm as our package manager)
- **Docker** and **Docker Compose** (for running tests with PostgreSQL)
- **Git** for version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/zodipus.git
cd zodipus
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/bratsos/zodipus.git
```

## Development Setup

### Installation

```bash
# Install dependencies
pnpm install

# Build the package
cd packages/zodipus
pnpm build
```

### Running Tests

Tests require a PostgreSQL database. We provide Docker Compose configuration for easy setup:

```bash
cd packages/zodipus

# Start the test database
pnpm db:start

# Run database migrations
pnpm db:migrate

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Stop the database when done
pnpm db:stop
```

### Running the Example

```bash
cd examples/basic-usage

# Follow the README in that directory for setup instructions
```

## Making Changes

### Branch Naming

Create a descriptive branch for your changes:

```bash
git checkout -b feature/add-new-validation
git checkout -b fix/handle-null-relations
git checkout -b docs/improve-readme
```

### What to Work On

- **Good first issues**: Look for issues labeled `good first issue`
- **Bug fixes**: Check for issues labeled `bug`
- **Features**: Discuss new features in an issue before implementing
- **Documentation**: Documentation improvements are always welcome!

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:
   ```bash
   cd packages/zodipus
   pnpm lint          # Check code style
   pnpm format        # Format code
   pnpm typecheck     # TypeScript validation
   pnpm test          # Run tests
   pnpm build         # Ensure build succeeds
   ```

3. **Update documentation** if needed

### Submitting a PR

1. Push your branch to your fork:
   ```bash
   git push origin your-branch-name
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template with:
   - Clear description of changes
   - Link to related issue (if applicable)
   - Screenshots for UI changes
   - Breaking change notes (if any)

### Review Process

- A maintainer will review your PR
- Address any feedback or requested changes
- Once approved, a maintainer will merge your PR

## Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting.

### Linting

```bash
# Check for issues
pnpm lint

# Format code
pnpm format
```

### Style Guidelines

- Use **TypeScript** for all code
- Prefer **const** over let when possible
- Use **descriptive variable names**
- Add **JSDoc comments** for public APIs
- Keep functions **focused and small**

### File Organization

```
packages/zodipus/src/
├── index.ts          # Entry point & exports
├── generator.ts      # Core Prisma generator logic
├── queryEngine.ts    # Type-safe query builder
├── cli.ts            # Command-line interface
├── errors.ts         # Custom error classes
└── *.test.ts         # Test files alongside source
```

## Testing

### Running Tests

```bash
cd packages/zodipus

# All tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test -- --coverage
```

### Writing Tests

- Place test files next to source files (e.g., `generator.test.ts`)
- Use descriptive test names
- Cover edge cases and error scenarios
- Use snapshot tests for generated output

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should handle normal input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(generator): add support for Decimal fields

fix(queryEngine): handle null relations correctly

docs: update README with Query Engine examples

test(generator): add unit tests for mapPrismaTypeToZod
```

## Questions?

- Open an issue for questions about contributing
- Check existing issues and discussions first
- Be patient - maintainers are volunteers

---

**Thank you for contributing to Zodipus!** 🦑
