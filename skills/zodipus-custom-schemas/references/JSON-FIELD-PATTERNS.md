# JSON Field Patterns

Advanced patterns for typing Prisma JSON fields with Zod.

## Table of Contents

1. [Basic Patterns](#basic-patterns)
2. [Complex Objects](#complex-objects)
3. [Arrays and Collections](#arrays-and-collections)
4. [Union Types](#union-types)
5. [Recursive Structures](#recursive-structures)
6. [Validation Patterns](#validation-patterns)
7. [Default Values](#default-values)
8. [Real-World Examples](#real-world-examples)

---

## Basic Patterns

### Simple Object

```typescript
export const ProfileSchema = z.object({
  bio: z.string().max(500),
  website: z.string().url().optional(),
  location: z.string().optional(),
});
```

### Key-Value Store

```typescript
// Any string keys, string values
export const MetadataSchema = z.record(z.string());

// Any string keys, any JSON values
export const FlexibleMetadataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

// Constrained keys
export const LabeledDataSchema = z.record(
  z.string().regex(/^[a-z_]+$/),
  z.string()
);
```

### Tuple (Fixed Array)

```typescript
// Exactly 2 numbers (coordinates)
export const CoordinatesSchema = z.tuple([z.number(), z.number()]);

// Mixed types
export const RangeSchema = z.tuple([z.number(), z.number(), z.string()]);
// [min, max, unit]
```

---

## Complex Objects

### Nested Objects

```typescript
export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().default('US'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
});
```

### Optional Sections

```typescript
export const UserProfileSchema = z.object({
  // Required
  displayName: z.string().min(1).max(50),

  // Optional sections
  social: z.object({
    twitter: z.string().optional(),
    github: z.string().optional(),
    linkedin: z.string().optional(),
  }).optional(),

  preferences: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    language: z.string().default('en'),
  }).optional(),
});
```

### Strict vs Passthrough

```typescript
// Strict: removes unknown keys (default)
export const StrictSchema = z.object({
  name: z.string(),
}).strict();

// Passthrough: keeps unknown keys
export const FlexibleSchema = z.object({
  name: z.string(),
}).passthrough();

// Catchall: types unknown keys
export const TypedExtrasSchema = z.object({
  name: z.string(),
}).catchall(z.string());
```

---

## Arrays and Collections

### Simple Array

```typescript
export const TagsSchema = z.array(z.string());
export const ScoresSchema = z.array(z.number());
```

### Array of Objects

```typescript
export const CartItemsSchema = z.array(z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  options: z.record(z.string()).optional(),
}));
```

### Constrained Arrays

```typescript
// At least one item
export const NonEmptyTagsSchema = z.array(z.string()).nonempty();

// Exactly 3 items
export const RGBSchema = z.array(z.number().int().min(0).max(255)).length(3);

// Between 1 and 10 items
export const SelectedItemsSchema = z.array(z.string()).min(1).max(10);
```

### Set-like Behavior

```typescript
// Unique items (via refinement)
export const UniqueTagsSchema = z.array(z.string()).refine(
  (items) => new Set(items).size === items.length,
  { message: 'Tags must be unique' }
);
```

---

## Union Types

### Simple Union

```typescript
export const StatusSchema = z.union([
  z.literal('pending'),
  z.literal('active'),
  z.literal('completed'),
]);
// Same as: z.enum(['pending', 'active', 'completed'])
```

### Object Union

```typescript
export const NotificationSchema = z.union([
  z.object({
    type: z.literal('email'),
    address: z.string().email(),
  }),
  z.object({
    type: z.literal('sms'),
    phone: z.string(),
  }),
  z.object({
    type: z.literal('push'),
    deviceToken: z.string(),
  }),
]);
```

### Discriminated Union (Preferred)

```typescript
// More efficient parsing + better type inference
export const PaymentSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('card'),
    last4: z.string().length(4),
    brand: z.enum(['visa', 'mastercard', 'amex']),
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(2024),
  }),
  z.object({
    method: z.literal('bank_transfer'),
    bankName: z.string(),
    accountLast4: z.string().length(4),
    routingNumber: z.string(),
  }),
  z.object({
    method: z.literal('crypto'),
    currency: z.enum(['BTC', 'ETH', 'USDC']),
    walletAddress: z.string(),
  }),
]);
```

---

## Recursive Structures

### Tree Node

```typescript
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    children: z.array(TreeNodeSchema).optional(),
  })
);
```

### Comment Thread

```typescript
interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  replies?: Comment[];
}

export const CommentSchema: z.ZodType<Comment> = z.lazy(() =>
  z.object({
    id: z.string(),
    content: z.string(),
    author: z.string(),
    createdAt: z.string().datetime(),
    replies: z.array(CommentSchema).optional(),
  })
);
```

### Nested Categories

```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  parent?: Category;
  subcategories?: Category[];
}

export const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    parent: CategorySchema.optional(),
    subcategories: z.array(CategorySchema).optional(),
  })
);
```

---

## Validation Patterns

### Cross-Field Validation

```typescript
export const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  { message: 'End date must be after start date' }
);
```

### Conditional Fields

```typescript
export const ShippingSchema = z.object({
  method: z.enum(['pickup', 'delivery']),
  address: z.string().optional(),
}).refine(
  (data) => data.method === 'pickup' || data.address,
  { message: 'Address required for delivery', path: ['address'] }
);
```

### Business Rules

```typescript
export const OrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).nonempty(),
  discount: z.number().min(0).max(100).optional(),
  total: z.number().positive(),
}).refine(
  (data) => {
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const discountAmount = subtotal * ((data.discount ?? 0) / 100);
    return Math.abs(data.total - (subtotal - discountAmount)) < 0.01;
  },
  { message: 'Total does not match calculated amount' }
);
```

---

## Default Values

### Simple Defaults

```typescript
export const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  fontSize: z.number().int().min(10).max(24).default(14),
  notifications: z.boolean().default(true),
});
```

### Nested Defaults

```typescript
export const ConfigSchema = z.object({
  api: z.object({
    timeout: z.number().default(30000),
    retries: z.number().int().default(3),
  }).default({}),
  features: z.object({
    darkMode: z.boolean().default(false),
    experimental: z.boolean().default(false),
  }).default({}),
}).default({});
```

### Dynamic Defaults

```typescript
export const AuditSchema = z.object({
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  version: z.number().int().default(1),
});
```

---

## Real-World Examples

### E-commerce Product Metadata

```typescript
export const ProductMetadataSchema = z.object({
  // Inventory
  sku: z.string(),
  barcode: z.string().optional(),
  weight: z.object({
    value: z.number().positive(),
    unit: z.enum(['kg', 'lb', 'oz', 'g']),
  }).optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(['cm', 'in', 'm']),
  }).optional(),

  // Variants
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
    attributes: z.record(z.string()),
  })).default([]),

  // SEO
  seo: z.object({
    title: z.string().max(60).optional(),
    description: z.string().max(160).optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),

  // Flags
  featured: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  onSale: z.boolean().default(false),
});
```

### SaaS User Settings

```typescript
export const UserSettingsSchema = z.object({
  // Display
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    density: z.enum(['comfortable', 'compact']).default('comfortable'),
    fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  }).default({}),

  // Notifications
  notifications: z.object({
    email: z.object({
      marketing: z.boolean().default(false),
      product: z.boolean().default(true),
      security: z.boolean().default(true),
    }).default({}),
    push: z.object({
      enabled: z.boolean().default(false),
      sound: z.boolean().default(true),
    }).default({}),
    inApp: z.boolean().default(true),
  }).default({}),

  // Privacy
  privacy: z.object({
    showProfile: z.boolean().default(true),
    showActivity: z.boolean().default(true),
    allowAnalytics: z.boolean().default(true),
  }).default({}),

  // Integrations
  integrations: z.record(z.object({
    enabled: z.boolean(),
    apiKey: z.string().optional(),
    settings: z.record(z.unknown()).optional(),
  })).default({}),
}).default({});
```

### CMS Page Content

```typescript
const BlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: z.string(),
    format: z.enum(['plain', 'markdown', 'html']).default('markdown'),
  }),
  z.object({
    type: z.literal('image'),
    src: z.string().url(),
    alt: z.string(),
    caption: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('video'),
    src: z.string().url(),
    poster: z.string().url().optional(),
    autoplay: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('embed'),
    provider: z.enum(['youtube', 'vimeo', 'twitter', 'custom']),
    url: z.string().url(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('code'),
    language: z.string(),
    code: z.string(),
    filename: z.string().optional(),
  }),
]);

export const PageContentSchema = z.object({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  blocks: z.array(BlockSchema).default([]),
  meta: z.object({
    author: z.string().optional(),
    publishedAt: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }).default({}),
});
```
