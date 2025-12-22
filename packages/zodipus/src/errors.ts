/**
 * Custom error classes for Zodipus
 *
 * These errors provide better context for debugging validation
 * and generation issues.
 */

/**
 * Base error class for all Zodipus errors
 */
export class ZodipusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZodipusError';
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Context for validation errors
 */
export interface ValidationErrorContext {
  /** The model being validated */
  model: string;
  /** The field that failed validation (if applicable) */
  field?: string;
  /** The expected type or value */
  expected?: string;
  /** The received type or value */
  received?: string;
  /** The path to the field in nested objects */
  path?: (string | number)[];
}

/**
 * Error thrown when data validation fails
 *
 * @example
 * ```typescript
 * throw new ZodipusValidationError('Invalid data type', {
 *   model: 'User',
 *   field: 'email',
 *   expected: 'string',
 *   received: 'number',
 *   path: ['user', 'email'],
 * });
 * ```
 */
export class ZodipusValidationError extends ZodipusError {
  readonly context: ValidationErrorContext;

  constructor(message: string, context: ValidationErrorContext) {
    const contextInfo = [
      `Model: ${context.model}`,
      context.field ? `Field: ${context.field}` : null,
      context.expected ? `Expected: ${context.expected}` : null,
      context.received ? `Received: ${context.received}` : null,
      context.path?.length ? `Path: ${context.path.join('.')}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    super(`${message} (${contextInfo})`);
    this.name = 'ZodipusValidationError';
    this.context = context;
  }
}

/**
 * Error thrown during schema generation
 */
export class ZodipusGeneratorError extends ZodipusError {
  readonly schemaPath?: string;
  readonly modelName?: string;

  constructor(message: string, options?: { schemaPath?: string; modelName?: string }) {
    const contextParts = [
      options?.schemaPath ? `Schema: ${options.schemaPath}` : null,
      options?.modelName ? `Model: ${options.modelName}` : null,
    ].filter(Boolean);

    const fullMessage = contextParts.length ? `${message} (${contextParts.join(', ')})` : message;

    super(fullMessage);
    this.name = 'ZodipusGeneratorError';
    this.schemaPath = options?.schemaPath;
    this.modelName = options?.modelName;
  }
}
