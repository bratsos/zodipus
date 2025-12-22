import { z } from 'zod';

/**
 * Custom Zod schemas for JSON fields
 * 
 * These schemas provide type-safe validation for JSON fields
 * referenced via @zodSchema annotations in the Prisma schema.
 */

/**
 * User settings schema
 * Defines user preferences and configuration
 */
export const UserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    inApp: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    showEmail: z.boolean().optional(),
    showProfile: z.boolean().optional(),
  }).optional(),
});

/**
 * Post metadata schema
 * Includes SEO information and featured content
 */
export const PostMetadataSchema = z.object({
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  featuredImage: z.object({
    url: z.string(),
    alt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  readTime: z.number().optional(), // in minutes
  excerpt: z.string().optional(),
});
