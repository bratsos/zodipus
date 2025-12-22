import type { PrismaClient } from '@prisma/client';

// Get prisma from test-setup
let prismaInstance: PrismaClient;

export function setPrismaInstance(prisma: PrismaClient) {
  prismaInstance = prisma;
}

export async function seedTestData() {
  const prisma = prismaInstance;
  if (!prisma) {
    throw new Error('Prisma instance not set. Call setPrismaInstance() first.');
  }

  // Clean up existing data (order matters for foreign keys)
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Smith',
      role: 'USER',
      profile: {
        create: {
          bio: 'Software engineer and tech enthusiast',
        },
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Johnson',
      role: 'ADMIN',
      profile: {
        create: {
          bio: 'Full-stack developer and open source contributor',
        },
      },
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      role: 'USER',
    },
  });

  // Create categories
  const techCategory = await prisma.category.create({
    data: {
      name: 'Technology',
      slug: 'technology',
    },
  });

  const lifestyleCategory = await prisma.category.create({
    data: {
      name: 'Lifestyle',
      slug: 'lifestyle',
    },
  });

  // Create tags
  const typescriptTag = await prisma.tag.create({
    data: { name: 'TypeScript', slug: 'typescript' },
  });

  const webdevTag = await prisma.tag.create({
    data: { name: 'Web Development', slug: 'web-development' },
  });

  const tutorialTag = await prisma.tag.create({
    data: { name: 'Tutorial', slug: 'tutorial' },
  });

  // Create posts with tags
  const post1 = await prisma.post.create({
    data: {
      title: 'Getting Started with TypeScript',
      slug: 'getting-started-with-typescript',
      content: 'TypeScript is a powerful language that adds type safety to JavaScript...',
      published: true,
      status: 'PUBLISHED',
      authorId: user1.id,
      categoryId: techCategory.id,
      tags: {
        connect: [{ id: typescriptTag.id }, { id: tutorialTag.id }],
      },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: 'Building Modern Web Apps',
      slug: 'building-modern-web-apps',
      content: 'Modern web development requires understanding of various tools and frameworks...',
      published: true,
      status: 'PUBLISHED',
      authorId: user1.id,
      categoryId: techCategory.id,
      tags: {
        connect: [{ id: webdevTag.id }, { id: typescriptTag.id }],
      },
    },
  });

  const post3 = await prisma.post.create({
    data: {
      title: 'Draft: Future of AI',
      slug: 'draft-future-of-ai',
      content: 'This is a draft post about artificial intelligence...',
      published: false,
      status: 'DRAFT',
      authorId: user2.id,
      categoryId: techCategory.id,
    },
  });

  const post4 = await prisma.post.create({
    data: {
      title: 'Work-Life Balance Tips',
      slug: 'work-life-balance-tips',
      content: 'Maintaining a healthy work-life balance is crucial...',
      published: true,
      status: 'PUBLISHED',
      authorId: user2.id,
      categoryId: lifestyleCategory.id,
    },
  });

  const post5 = await prisma.post.create({
    data: {
      title: 'My First Post',
      slug: 'my-first-post',
      content: 'This is my first blog post!',
      published: true,
      status: 'PUBLISHED',
      authorId: user3.id,
      categoryId: lifestyleCategory.id,
    },
  });

  // Create comments with threaded replies (self-referential)
  const comment1 = await prisma.comment.create({
    data: {
      content: 'Great article on TypeScript!',
      authorId: user2.id,
      postId: post1.id,
    },
  });

  const reply1 = await prisma.comment.create({
    data: {
      content: 'Thanks Bob! Glad you found it helpful.',
      authorId: user1.id,
      postId: post1.id,
      parentId: comment1.id, // Reply to comment1
    },
  });

  const reply2 = await prisma.comment.create({
    data: {
      content: 'Do you have any follow-up articles planned?',
      authorId: user3.id,
      postId: post1.id,
      parentId: comment1.id, // Also a reply to comment1
    },
  });

  const nestedReply = await prisma.comment.create({
    data: {
      content: "Yes, I'm working on an advanced TypeScript guide!",
      authorId: user1.id,
      postId: post1.id,
      parentId: reply2.id, // Reply to reply2 (nested)
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      content: 'This helped me understand closures better.',
      authorId: user3.id,
      postId: post2.id,
    },
  });

  console.log('✅ Test data seeded successfully!');
  console.log(`Created ${await prisma.user.count()} users`);
  console.log(`Created ${await prisma.profile.count()} profiles`);
  console.log(`Created ${await prisma.post.count()} posts`);
  console.log(`Created ${await prisma.category.count()} categories`);
  console.log(`Created ${await prisma.tag.count()} tags`);
  console.log(`Created ${await prisma.comment.count()} comments`);

  return {
    users: [user1, user2, user3],
    posts: [post1, post2, post3, post4, post5],
    categories: [techCategory, lifestyleCategory],
    tags: [typescriptTag, webdevTag, tutorialTag],
    comments: [comment1, reply1, reply2, nestedReply, comment2],
  };
}

export async function cleanupTestData() {
  const prisma = prismaInstance;
  if (!prisma) {
    throw new Error('Prisma instance not set. Call setPrismaInstance() first.');
  }

  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}
