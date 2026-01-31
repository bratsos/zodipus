# Error Reference

Complete reference of Zodipus errors and their solutions.

## Zod Errors

### ZodError

Base Zod validation error. Occurs when `.parse()` fails.

**Structure:**
```typescript
{
  issues: [
    {
      code: 'invalid_type',
      expected: 'string',
      received: 'number',
      path: ['email'],
      message: 'Expected string, received number'
    }
  ]
}
```

**Common Issue Codes:**

| Code | Meaning | Example |
|------|---------|---------|
| `invalid_type` | Wrong type | Expected string, got number |
| `invalid_string` | String validation failed | Invalid email format |
| `invalid_enum_value` | Not a valid enum option | Role must be USER or ADMIN |
| `too_small` | Below minimum | String must be at least 1 character |
| `too_big` | Above maximum | String must be at most 100 characters |
| `invalid_date` | Invalid date | Could not parse as date |
| `custom` | Custom validation failed | Refinement check failed |

**Debugging:**
```typescript
const result = schema.safeParse(data);
if (!result.success) {
  // Formatted view
  console.log(result.error.format());

  // Flat list
  console.log(result.error.flatten());

  // Issue details
  result.error.issues.forEach(issue => {
    console.log(`${issue.path.join('.')}: ${issue.message}`);
  });
}
```

---

## Zodipus Errors

### ZodipusError

Base error class for all Zodipus-specific errors.

```typescript
import { ZodipusError } from 'zodipus/errors';

try {
  // ...
} catch (error) {
  if (error instanceof ZodipusError) {
    console.log(error.message);
    console.log(error.context); // Additional context
  }
}
```

### ZodipusValidationError

Validation failed with additional context.

```typescript
import { ZodipusValidationError } from 'zodipus/errors';

try {
  const result = query.parse(data);
} catch (error) {
  if (error instanceof ZodipusValidationError) {
    console.log('Model:', error.context.model);
    console.log('Field:', error.context.field);
    console.log('Path:', error.context.path);
    console.log('Original error:', error.cause);
  }
}
```

### ZodipusGeneratorError

Error during schema generation.

```typescript
import { ZodipusGeneratorError } from 'zodipus/errors';

// Usually seen in prisma generate output
// ZodipusGeneratorError: Failed to generate schema for model User
// Context: { model: 'User', field: 'metadata', issue: 'Unknown @zodSchema' }
```

---

## Generation Errors

### "Cannot find module 'zodipus'"

**Cause:** Package not installed.

**Fix:**
```bash
npm install zodipus
```

### "Generator 'zodipus' failed"

**Cause:** Various generation issues.

**Debug:** Enable debug mode:
```prisma
generator zodipus {
  debug = "true"
}
```

Then run:
```bash
npx prisma generate
```

### "Cannot write to output directory"

**Cause:** Permission or path issue.

**Fixes:**
```bash
# Check path exists
ls -la ./generated

# Create if needed
mkdir -p ./generated

# Check permissions
chmod 755 ./generated
```

### "Custom schema 'X' not found"

**Cause:** `@zodSchema` references missing export.

**Fix:** Add to `custom-schemas.ts`:
```typescript
export const X = z.object({...});
```

### "Circular dependency detected"

**Cause:** Models reference each other in complex ways.

**Fix:** Increase relation depth or simplify schema:
```prisma
generator zodipus {
  relationDepth = "10"
}
```

---

## Runtime Errors

### "Cannot read property 'parse' of undefined"

**Cause:** Query builder not called.

**Wrong:**
```typescript
const userQuery = registry.createQuery('user');
userQuery.parse(data); // Error: userQuery is a function
```

**Correct:**
```typescript
const userQuery = registry.createQuery('user');
const query = userQuery({ select: { id: true } }); // Call it
query.parse(data); // Now works
```

### "Unknown model: X"

**Cause:** Model not in registry.

**Fixes:**
1. Check model name (case-sensitive):
```typescript
registry.createQuery('user');  // lowercase
registry.createQuery('User');  // might not work
```

2. Ensure using correct imports:
```typescript
import { models, modelRelations } from './generated/generated-index';
```

3. Regenerate after schema changes:
```bash
npx prisma generate
```

### "Expected object, received array"

**Cause:** Using single-item parse for array.

**Wrong:**
```typescript
const users = await prisma.user.findMany(query.query);
query.parse(users); // Error: expected object
```

**Correct:**
```typescript
query.array().parse(users);
```

### "Expected array, received object"

**Cause:** Using array parse for single item.

**Wrong:**
```typescript
const user = await prisma.user.findFirst(query.query);
query.array().parse(user); // Error: expected array
```

**Correct:**
```typescript
query.parse(user);
```

---

## Type Errors

### "Property 'X' does not exist on type"

**Cause:** Field not selected.

**Fix:** Add to select:
```typescript
const query = userQuery({
  select: {
    id: true,
    email: true,
    name: true, // Add missing field
  }
});
```

### "Type 'X' is not assignable to type 'Y'"

**Cause:** Type mismatch between expected and actual.

**Debug:**
```typescript
// Check actual type
const query = userQuery({ select: { id: true } });
type Result = z.infer<ReturnType<typeof query.parse>>;
// Hover over Result to see type
```

### "Argument of type 'X' is not assignable to parameter of type 'Y'"

**Cause:** Wrong argument type.

**Common cases:**
1. Passing wrong query config
2. Schema type mismatch
3. Missing required fields

---

## Validation Error Patterns

### Invalid Email

```
{
  "code": "invalid_string",
  "validation": "email",
  "path": ["email"],
  "message": "Invalid email"
}
```

**Cause:** Email field doesn't match email format.

### Invalid Enum

```
{
  "code": "invalid_enum_value",
  "received": "admin",
  "options": ["USER", "ADMIN"],
  "path": ["role"],
  "message": "Invalid enum value. Expected 'USER' | 'ADMIN', received 'admin'"
}
```

**Cause:** Enum value case mismatch.

### Invalid Date

```
{
  "code": "invalid_date",
  "path": ["createdAt"],
  "message": "Invalid date"
}
```

**Cause:** Value can't be parsed as date.

### Missing Required Field

```
{
  "code": "invalid_type",
  "expected": "string",
  "received": "undefined",
  "path": ["email"],
  "message": "Required"
}
```

**Cause:** Required field is undefined.

---

## Error Handling Best Practices

### Use safeParse for User Input

```typescript
const result = schema.safeParse(userInput);
if (!result.success) {
  return {
    success: false,
    errors: result.error.flatten().fieldErrors,
  };
}
return { success: true, data: result.data };
```

### Wrap Parse in Try-Catch for Internal Data

```typescript
try {
  const validated = schema.parse(internalData);
  // process validated data
} catch (error) {
  if (error instanceof z.ZodError) {
    // Log for debugging
    console.error('Validation failed:', error.format());
    // Re-throw or handle
    throw new Error('Internal data validation failed');
  }
  throw error;
}
```

### Create Error Formatters

```typescript
function formatZodError(error: z.ZodError) {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}
```
