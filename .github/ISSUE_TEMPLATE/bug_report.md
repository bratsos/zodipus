---
name: Bug Report
about: Report a bug or unexpected behavior
title: '[Bug] '
labels: bug
assignees: ''
---

## Description

A clear and concise description of the bug.

## Steps to Reproduce

1. Configure Zodipus with...
2. Create a Prisma schema like...
3. Run `prisma generate`
4. See error...

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened. Include error messages if applicable.

## Environment

- **Zodipus version**: 
- **Prisma version**: 
- **Zod version**: 
- **Node.js version**: 
- **Operating System**: 

## Prisma Schema (if applicable)

```prisma
// Paste relevant parts of your schema
generator zodipus {
  provider = "zodipus"
  output   = "./generated"
}

model YourModel {
  // ...
}
```

## Generated Output (if applicable)

```typescript
// Paste the problematic generated code
```

## Additional Context

Add any other context about the problem here.
