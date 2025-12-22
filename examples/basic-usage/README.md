# Zodipus Basic Usage Example

This example demonstrates the core features of Zodipus, a Prisma generator that creates clean Zod schemas.

## Quick Start

### 1. Prerequisites

- Node.js v23.10.0 or higher
- pnpm 8.15.0 or higher
- Docker and Docker Compose

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/bratsos/zodipus.git
cd zodipus
pnpm install
```

### 3. Setup Example Database

Navigate to the `examples/basic-usage` directory:

```bash
cd examples/basic-usage
```

Create a `.env` file with your database connection string (see `.env.example`):

```
DATABASE_URL="postgresql://zodipus_example:zodipus_example_password@localhost:5434/zodipus_example?schema=public"
```

Start the PostgreSQL container, push the schema, and generate Prisma Client/Zod schemas:

```bash
pnpm setup
```

### 4. Run the Example

```bash
pnpm dev
```

This will run the `src/demo.ts` file, demonstrating the Zodipus generator in action.

## Features

See [packages/zodipus/README.md](packages/zodipus/README.md) for complete documentation.
