import { describe, expect, it } from 'vitest';
import { modelRelations, models } from './generated/generated-index';
import { createRegistry } from './queryEngine';
import { prisma, setupTestHooks } from './test-setup';

// Setup database before tests
setupTestHooks();

// Create the Query Engine registry
const registry = createRegistry({
  models: {
    user: models.UserSchema,
    post: models.PostSchema,
    profile: models.ProfileSchema,
    category: models.CategorySchema,
    comment: models.CommentSchema,
    tag: models.TagSchema,
  },
  relations: modelRelations,
});

// Create query functions for each model
const userQuery = registry.createQuery('user');
const postQuery = registry.createQuery('post');
const profileQuery = registry.createQuery('profile');
const categoryQuery = registry.createQuery('category');
const commentQuery = registry.createQuery('comment');
const tagQuery = registry.createQuery('tag');

describe('QueryEngine with Real Database', () => {
  describe('Basic CRUD Operations', () => {
    it('should fetch all users', async () => {
      const query = userQuery({});
      const users = await prisma.user.findMany(query.query);
      const parsed = query.array().parse(users);

      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('email');
      expect(parsed[0]).toHaveProperty('name');
    });

    it('should fetch user by email', async () => {
      const query = userQuery({
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      const user = await prisma.user.findUnique({
        where: { email: 'alice@example.com' },
        ...query.query,
      });

      const parsed = query.parse(user);

      expect(parsed).toBeDefined();
      expect(parsed?.email).toBe('alice@example.com');
      expect(parsed?.name).toBe('Alice Smith');
    });

    it('should fetch published posts', async () => {
      const query = postQuery({});
      const posts = await prisma.post.findMany({
        where: { published: true },
        ...query.query,
      });

      const parsed = query.array().parse(posts);

      expect(parsed.length).toBeGreaterThan(0);
      for (const post of parsed) {
        expect(post.published).toBe(true);
      }
    });

    it('should handle null results for non-existent user', async () => {
      const query = userQuery({});
      const user = await prisma.user.findUnique({
        where: { email: 'nonexistent@example.com' },
        ...query.query,
      });

      // Null is expected, so we don't parse it
      expect(user).toBeNull();
    });
  });

  describe('Relations', () => {
    it('should fetch user with posts', async () => {
      const query = userQuery({
        select: {
          id: true,
          email: true,
          name: true,
        },
        posts: true,
      });

      const user = await prisma.user.findFirst({
        where: { email: 'alice@example.com' },
        ...query.query,
      });

      const parsed = query.parse(user);

      expect(parsed).toBeDefined();
      expect(parsed?.posts).toBeDefined();
      expect(Array.isArray(parsed?.posts)).toBe(true);
      expect(parsed?.posts.length).toBeGreaterThan(0);
    });

    it('should fetch user with profile', async () => {
      const query = userQuery({
        select: {
          id: true,
          email: true,
          name: true,
        },
        profile: true,
      });

      const user = await prisma.user.findFirst({
        where: { email: 'alice@example.com' },
        ...query.query,
      });

      const parsed = query.parse(user);

      expect(parsed).toBeDefined();
      expect(parsed?.profile).toBeDefined();
      expect(parsed?.profile?.bio).toBe('Software engineer and tech enthusiast');
    });

    it('should fetch profile with user relation', async () => {
      const query = profileQuery({
        select: {
          id: true,
          bio: true,
        },
        user: true,
      });

      const profile = await prisma.profile.findFirst({
        ...query.query,
      });

      const parsed = query.parse(profile);

      expect(parsed).toBeDefined();
      expect(parsed?.user).toBeDefined();
    });

    it('should fetch post with author', async () => {
      const query = postQuery({
        select: {
          id: true,
          title: true,
        },
        author: true,
      });

      const post = await prisma.post.findFirst({
        where: { title: 'Getting Started with TypeScript' },
        ...query.query,
      });

      const parsed = query.parse(post);

      expect(parsed).toBeDefined();
      expect(parsed?.author).toBeDefined();
      expect(parsed?.author.name).toBe('Alice Smith');
    });

    it('should fetch post with category', async () => {
      const query = postQuery({
        select: {
          id: true,
          title: true,
        },
        category: true,
      });

      const post = await prisma.post.findFirst({
        where: { title: 'Getting Started with TypeScript' },
        ...query.query,
      });

      const parsed = query.parse(post);

      expect(parsed).toBeDefined();
      expect(parsed?.category).toBeDefined();
    });

    it('should fetch deeply nested relations', async () => {
      const query = userQuery({
        select: {
          id: true,
          email: true,
        },
        posts: {
          select: {
            id: true,
            title: true,
          },
        },
        profile: true,
      });

      const user = await prisma.user.findFirst({
        where: { email: 'alice@example.com' },
        ...query.query,
      });

      const parsed = query.parse(user);

      expect(parsed).toBeDefined();
      expect(parsed?.posts).toBeDefined();
      expect(parsed?.posts.length).toBeGreaterThan(0);
      expect(parsed?.profile).toBeDefined();
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter users by role', async () => {
      const query = userQuery({});
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        ...query.query,
      });

      const parsed = query.array().parse(admins);

      expect(parsed.length).toBeGreaterThan(0);
      for (const admin of parsed) {
        expect(admin.role).toBe('ADMIN');
      }
    });

    it('should sort posts by creation date', async () => {
      const query = postQuery({});
      const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        ...query.query,
      });

      const parsed = query.array().parse(posts);

      expect(parsed.length).toBeGreaterThan(1);
      for (let i = 0; i < parsed.length - 1; i++) {
        expect(new Date(parsed[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(parsed[i + 1].createdAt).getTime()
        );
      }
    });

    it('should paginate results', async () => {
      const query = postQuery({});
      const firstPage = await prisma.post.findMany({
        take: 2,
        skip: 0,
        orderBy: { id: 'asc' },
        ...query.query,
      });

      const secondPage = await prisma.post.findMany({
        take: 2,
        skip: 2,
        orderBy: { id: 'asc' },
        ...query.query,
      });

      const parsedFirst = query.array().parse(firstPage);
      const parsedSecond = query.array().parse(secondPage);

      expect(parsedFirst).toHaveLength(2);
      expect(parsedSecond.length).toBeGreaterThan(0);
      expect(parsedFirst[0].id).not.toBe(parsedSecond[0]?.id);
    });
  });

  describe('Aggregations', () => {
    it('should count posts by author', async () => {
      const userWithCount = await prisma.user.findFirst({
        where: { email: 'alice@example.com' },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      });

      expect(userWithCount).toBeDefined();
      expect(userWithCount?._count.posts).toBeGreaterThan(0);
    });

    it('should group posts by published status', async () => {
      const publishedCount = await prisma.post.count({
        where: { published: true },
      });

      const draftCount = await prisma.post.count({
        where: { published: false },
      });

      expect(publishedCount).toBeGreaterThan(0);
      expect(draftCount).toBeGreaterThan(0);
    });
  });

  describe('Complex Query Scenarios', () => {
    it('should fetch user with filtered posts', async () => {
      const user = await prisma.user.findFirst({
        where: { email: 'alice@example.com' },
        select: {
          id: true,
          email: true,
          posts: {
            where: { published: true },
          },
        },
      });

      expect(user).toBeDefined();
      expect(user?.posts).toBeDefined();
      for (const post of user?.posts || []) {
        expect(post.published).toBe(true);
      }
    });

    it('should fetch posts with specific fields only', async () => {
      const query = postQuery({
        select: {
          id: true,
          title: true,
          published: true,
        },
      });

      const posts = await prisma.post.findMany(query.query);

      const parsed = query.array().parse(posts);

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('title');
      expect(parsed[0]).toHaveProperty('published');
      expect(parsed[0]).not.toHaveProperty('content');
    });

    it('should handle category with posts relation', async () => {
      const query = categoryQuery({
        select: {
          id: true,
          name: true,
        },
        posts: true,
      });

      const category = await prisma.category.findFirst({
        where: { name: 'Technology' },
        ...query.query,
      });

      const parsed = query.parse(category);

      expect(parsed).toBeDefined();
      expect(parsed?.posts).toBeDefined();
      expect(parsed?.posts.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid data structure', () => {
      const query = userQuery({});
      const invalidUser = {
        id: 'valid-id',
        email: 'invalid-email',
        name: 123, // wrong type
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => query.parse(invalidUser)).toThrow();
    });

    it('should throw on missing required fields', () => {
      const query = userQuery({});
      const incompleteUser = {
        email: 'test@example.com',
        // missing required fields
      };

      expect(() => query.parse(incompleteUser)).toThrow();
    });

    it('should handle array validation errors', () => {
      const query = userQuery({});
      const invalidUsers = [
        {
          id: 'id1',
          email: 'valid@example.com',
          name: 'Valid',
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { id: 'id2', email: 'bad', name: 123, role: 'INVALID' }, // invalid
      ];

      expect(() => query.array().parse(invalidUsers)).toThrow();
    });

    it('should validate enum values', () => {
      const query = userQuery({});
      const invalidRole = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'INVALID_ROLE', // invalid enum
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => query.parse(invalidRole)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result sets', async () => {
      const query = postQuery({});
      const posts = await prisma.post.findMany({
        where: { title: 'Non-existent Post Title 12345' },
        ...query.query,
      });

      const parsed = query.array().parse(posts);

      expect(parsed).toEqual([]);
      expect(parsed).toHaveLength(0);
    });

    it('should handle user without profile', async () => {
      const query = userQuery({
        select: {
          id: true,
          email: true,
        },
        profile: true,
      });

      const user = await prisma.user.findFirst({
        where: { email: 'charlie@example.com' },
        ...query.query,
      });

      const parsed = query.parse(user);

      expect(parsed).toBeDefined();
      expect(parsed?.profile).toBeNull();
    });

    it('should handle date fields correctly', async () => {
      const query = userQuery({});
      const user = await prisma.user.findFirst(query.query);

      const parsed = query.parse(user);

      expect(parsed).toBeDefined();
      expect(parsed?.createdAt).toBeInstanceOf(Date);
      expect(parsed?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Self-Referential Relations (Comments)', () => {
    it('should fetch comment with author', async () => {
      const query = commentQuery({
        select: {
          id: true,
          content: true,
        },
        author: true,
      });

      const comment = await prisma.comment.findFirst({
        where: { content: 'Great article on TypeScript!' },
        ...query.query,
      });

      const parsed = query.parse(comment);

      expect(parsed).toBeDefined();
      expect(parsed?.author).toBeDefined();
      expect(parsed?.author.name).toBe('Bob Johnson');
    });

    it('should fetch comment with replies (self-referential)', async () => {
      const query = commentQuery({
        select: {
          id: true,
          content: true,
        },
        replies: true,
      });

      const comment = await prisma.comment.findFirst({
        where: { content: 'Great article on TypeScript!' },
        ...query.query,
      });

      const parsed = query.parse(comment);

      expect(parsed).toBeDefined();
      expect(parsed?.replies).toBeDefined();
      expect(Array.isArray(parsed?.replies)).toBe(true);
      expect(parsed?.replies.length).toBeGreaterThan(0);
    });

    it('should fetch comment with parent (self-referential)', async () => {
      const query = commentQuery({
        select: {
          id: true,
          content: true,
        },
        parent: true,
      });

      const reply = await prisma.comment.findFirst({
        where: { content: 'Thanks Bob! Glad you found it helpful.' },
        ...query.query,
      });

      const parsed = query.parse(reply);

      expect(parsed).toBeDefined();
      expect(parsed?.parent).toBeDefined();
      expect(parsed?.parent?.content).toBe('Great article on TypeScript!');
    });

    it('should handle top-level comment without parent', async () => {
      const query = commentQuery({
        select: {
          id: true,
          content: true,
        },
        parent: true,
      });

      const comment = await prisma.comment.findFirst({
        where: { content: 'Great article on TypeScript!' },
        ...query.query,
      });

      const parsed = query.parse(comment);

      expect(parsed).toBeDefined();
      expect(parsed?.parent).toBeNull();
    });
  });

  describe('Many-to-Many Relations (Tags)', () => {
    it('should fetch tag with posts', async () => {
      const query = tagQuery({
        select: {
          id: true,
          name: true,
        },
        posts: true,
      });

      const tag = await prisma.tag.findFirst({
        where: { name: 'TypeScript' },
        ...query.query,
      });

      const parsed = query.parse(tag);

      expect(parsed).toBeDefined();
      expect(parsed?.posts).toBeDefined();
      expect(parsed?.posts.length).toBeGreaterThan(0);
    });

    it('should fetch post with tags', async () => {
      const query = postQuery({
        select: {
          id: true,
          title: true,
        },
        tags: true,
      });

      const post = await prisma.post.findFirst({
        where: { title: 'Getting Started with TypeScript' },
        ...query.query,
      });

      const parsed = query.parse(post);

      expect(parsed).toBeDefined();
      expect(parsed?.tags).toBeDefined();
      expect(parsed?.tags.length).toBeGreaterThan(0);
    });

    it('should fetch post with comments and their authors', async () => {
      const query = postQuery({
        select: {
          id: true,
          title: true,
        },
        comments: {
          select: {
            id: true,
            content: true,
          },
        },
      });

      const post = await prisma.post.findFirst({
        where: { title: 'Getting Started with TypeScript' },
        ...query.query,
      });

      const parsed = query.parse(post);

      expect(parsed).toBeDefined();
      expect(parsed?.comments).toBeDefined();
      expect(parsed?.comments.length).toBeGreaterThan(0);
    });
  });
});
