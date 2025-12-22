import { z } from 'zod';

/**
 * Custom Zod schemas for JSON fields
 *
 * This file contains custom schemas referenced via @zodSchema annotations
 * in your Prisma schema. Update these with your actual schema definitions.
 *
 * Example:
 * export const EntryDataSchema = z.object({
 *   commits: z.array(z.string()),
 *   pullRequests: z.array(z.number()),
 * });
 */

/**
 * Custom schema for UserSettingsSchema
 * TODO: Define your custom Zod schema here
 */
export const UserSettingsSchema = z.unknown(); // Replace with your schema

/**
 * Custom schema for PostMetadataSchema
 * TODO: Define your custom Zod schema here
 */
export const PostMetadataSchema = z.unknown(); // Replace with your schema
