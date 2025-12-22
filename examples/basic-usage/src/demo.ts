import { PrismaClient } from '@prisma/client';
import { createRegistry } from 'zodipus/queryEngine';
import {
  PostStatusSchema,
  UserRoleSchema,
  modelRelations,
  models,
} from './generated/generated-index';

const prisma = new PrismaClient();

// Create the Query Engine registry
const registry = createRegistry({
  models: {
    user: models.UserSchema,
    post: models.PostSchema,
    category: models.CategorySchema,
    profile: models.ProfileSchema,
    comment: models.CommentSchema,
    tag: models.TagSchema,
  },
  relations: modelRelations,
});

// Create type-safe query builders for each model
const userQuery = registry.createQuery('user');
const postQuery = registry.createQuery('post');
// const categoryQuery = registry.createQuery('category');
// const commentQuery = registry.createQuery('comment');
// const profileQuery = registry.createQuery('profile');
// const tagQuery = registry.createQuery('tag');

/**
 * Seed the database with example data
 */
async function seedDatabase() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  // Create users with validation
  console.log('Creating users...');
  const usersData = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN' as const,
      settings: {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          inApp: true,
        },
        privacy: {
          showEmail: false,
          showProfile: true,
        },
      },
    },
    {
      email: 'john@example.com',
      name: 'John Doe',
      role: 'USER' as const,
      settings: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false,
        },
      },
    },
    {
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'MODERATOR' as const,
      settings: {
        theme: 'auto',
        notifications: {
          email: true,
        },
      },
    },
  ];

  const { count: usersCount } = await prisma.user.createMany({
    data: usersData.map((user) => ({
      ...user,
      settings: user.settings,
    })),
  });

  console.log(`✅ Created ${usersCount} users`);

  const users = await prisma.user.findMany();
  // Create profiles
  console.log('Creating profiles...');

  await prisma.profile.create({
    data: {
      bio: 'System administrator and tech enthusiast',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      website: 'https://example.com',
      user: {
        connect: {
          id: users[0]?.id,
        },
      },
    },
  });

  await prisma.profile.create({
    data: {
      bio: 'Software developer and blogger',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      user: {
        connect: {
          id: users[1]?.id,
        },
      },
    },
  });

  console.log('✅ Created profiles');

  // Create categories
  console.log('Creating categories...');
  const categoriesData = [
    {
      name: 'Technology',
      slug: 'technology',
      description: 'All about tech and programming',
    },
    {
      name: 'Design',
      slug: 'design',
      description: 'UI/UX and graphic design',
    },
    {
      name: 'Tutorial',
      slug: 'tutorial',
      description: 'Step-by-step guides',
    },
  ];

  const { count: categoriesCount } = await prisma.category.createMany({
    data: categoriesData,
  });

  console.log(`✅ Created ${categoriesCount} categories`);
  const categories = await prisma.category.findMany();

  // Create tags
  console.log('Creating tags...');
  const tagsData = [
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'Prisma', slug: 'prisma' },
    { name: 'Zod', slug: 'zod' },
    { name: 'React', slug: 'react' },
    { name: 'Node.js', slug: 'nodejs' },
  ];

  const { count: tagsCount } = await prisma.tag.createMany({
    data: tagsData,
  });

  console.log(`✅ Created ${tagsCount} tags`);

  // Create posts
  console.log('Creating posts...');
  const postsData = [
    {
      title: 'Getting Started with Zodipus',
      content: 'Zodipus is a powerful Prisma generator that creates clean Zod schemas...',
      slug: 'getting-started-with-zodipus',
      published: true,
      status: 'PUBLISHED' as const,
      views: 142,
      authorId: users[0]?.id,
      categoryId: categories[0]?.id,
      metadata: {
        seo: {
          title: 'Getting Started with Zodipus - Complete Guide',
          description: 'Learn how to use Zodipus for type-safe Prisma validation',
          keywords: ['zodipus', 'prisma', 'zod', 'typescript'],
        },
        featuredImage: {
          url: 'https://picsum.photos/seed/zodipus1/1200/630',
          alt: 'Zodipus tutorial',
          width: 1200,
          height: 630,
        },
        readTime: 5,
        excerpt: 'A comprehensive guide to getting started with Zodipus',
      },
      publishedAt: new Date('2024-01-15'),
    },
    {
      title: 'Type-Safe JSON Fields with Zodipus',
      content: 'Learn how to use @zodSchema annotations for custom JSON validation...',
      slug: 'type-safe-json-fields',
      published: true,
      status: 'PUBLISHED' as const,
      views: 89,
      authorId: users[1]?.id,
      categoryId: categories[2]?.id,
      metadata: {
        seo: {
          title: 'Type-Safe JSON Fields with Zodipus',
          description: 'Master custom JSON schema validation',
          keywords: ['json', 'validation', 'zod'],
        },
        featuredImage: {
          url: 'https://picsum.photos/seed/zodipus2/1200/630',
          alt: 'JSON validation',
          width: 1200,
          height: 630,
        },
        readTime: 8,
      },
      publishedAt: new Date('2024-02-01'),
    },
    {
      title: 'Draft: Upcoming Features',
      content: 'This is a draft post about upcoming features...',
      slug: 'upcoming-features-draft',
      published: false,
      status: 'DRAFT' as const,
      views: 5,
      authorId: users[0]?.id,
      categoryId: categories[0]?.id,
      metadata: {
        readTime: 3,
      },
    },
  ];

  const { count: postsCount } = await prisma.post.createMany({
    data: postsData.map((post) => ({
      ...post,
      authorId: post.authorId!,
      categoryId: post.categoryId!,
      metadata: post.metadata,
    })),
  });

  console.log(`✅ Created ${postsCount} posts`);
  const posts = await prisma.post.findMany();

  // Create comments
  console.log('Creating comments...');
  const commentsData = [
    {
      content: 'Great tutorial! Very helpful for understanding Zodipus.',
      authorId: users[1]!.id,
      postId: posts[0]!.id,
    },
    {
      content: 'Thanks for the clear explanation. Looking forward to using this!',
      authorId: users[2]!.id,
      postId: posts[0]!.id,
    },
    {
      content: 'The JSON validation examples are exactly what I needed.',
      authorId: users[0]!.id,
      postId: posts[1]!.id,
    },
  ];

  const { count: commentsCount } = await prisma.comment.createMany({
    data: commentsData,
  });

  console.log(`✅ Created ${commentsCount} comments\n`);

  console.log('Database seeded successfully!');
  console.log(`Created ${usersCount} users`);
  console.log(`Created ${categoriesCount} categories`);
  console.log(`Created ${tagsCount} tags`);
  console.log(`Created ${postsCount} posts`);
  console.log(`Created ${commentsCount} comments`);
}

/**
 * Demonstrate Query Engine with type-safe queries
 */
async function demonstrateQueries() {
  console.log('🔍 Demonstrating Query Engine with type-safe queries\n');

  // Query 1: Get published posts with nested relations - fully type-safe!
  console.log('1️⃣  Fetching published posts with Query Engine...');
  
  const publishedPostsQuery = postQuery({
    select: {
      id: true,
      title: true,
      slug: true,
      views: true,
      status: true,
      metadata: true,
      publishedAt: true,
    },
    author: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
    category: {
      select: {
        name: true,
        slug: true,
      },
    },
    comments: {
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
      },
    },
  });

  const publishedPostsData = await prisma.post.findMany({
    where: { published: true },
    ...publishedPostsQuery.query,
  });

  // Parse and validate - results are fully typed!
  const validatedPosts = publishedPostsQuery.array().parse(publishedPostsData);

  console.log(`   Found ${validatedPosts.length} published posts`);
  for (const post of validatedPosts) {
    console.log(`   - "${post.title}" by ${post.author.name}`);
    console.log(`     Views: ${post.views}, Status: ${post.status}`);
    console.log(`     Comments: ${post.comments.length}`);
    if (post.metadata) {
      console.log(`     Read time: ${post.metadata.readTime} min`);
    }
  }

  // Query 2: Get user with posts and profile - type-safe nested relations
  console.log('\n2️⃣  Finding user with Query Engine...');
  
  const userDetailQuery = userQuery({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      settings: true,
    },
    posts: {
      select: {
        id: true,
        title: true,
        published: true,
        views: true,
      },
    },
    profile: {
      select: {
        bio: true,
        avatar: true,
        website: true,
      },
    },
  });

  const userData = await prisma.user.findUnique({
    where: { email: 'john@example.com' },
    ...userDetailQuery.query,
  });

  if (userData) {
    const validatedUser = userDetailQuery.parse(userData);
    console.log(`   Found: ${validatedUser.name} (${validatedUser.role})`);
    console.log(`   Posts: ${validatedUser.posts.length}`);
    // biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
    console.log(`   Settings:`, validatedUser.settings);
    if (validatedUser.profile) {
      console.log(`   Bio: ${validatedUser.profile.bio}`);
    }
  }

  // Query 3: Get category with posts - selective field picking
  console.log('\n3️⃣  Fetching category with posts...');
  
  const categoryQuery = registry.createQuery('category');
  const categoryDetailQuery = categoryQuery({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
    posts: {
      select: {
        id: true,
        title: true,
        views: true,
        publishedAt: true,
      },
    },
  });

  const categoryData = await prisma.category.findUnique({
    where: { slug: 'technology' },
    ...categoryDetailQuery.query,
  });

  if (categoryData) {
    const validatedCategory = categoryDetailQuery.parse(categoryData);
    console.log(`   Category: ${validatedCategory.name}`);
    console.log(`   Description: ${validatedCategory.description}`);
    console.log(`   Posts: ${validatedCategory.posts.length}`);
  }

  // Query 4: Complex nested query with multiple levels
  console.log('\n4️⃣  Complex nested query...');
  
  const complexPostQuery = postQuery({
    select: {
      id: true,
      title: true,
      content: true,
      views: true,
    },
    author: {
      select: {
        name: true,
        role: true,
      },
    },
    category: true, // Boolean - includes all fields
    tags: {
      select: {
        name: true,
        slug: true,
      },
    },
    comments: {
      select: {
        content: true,
        authorId: true,
      },
    },
  });

  const complexData = await prisma.post.findMany({
    where: {
      OR: [
        { title: { contains: 'Zodipus', mode: 'insensitive' } },
        { content: { contains: 'validation', mode: 'insensitive' } },
      ],
      published: true,
    },
    orderBy: { views: 'desc' },
    take: 2,
    ...complexPostQuery.query,
  });

  const validatedComplex = complexPostQuery.array().parse(complexData);
  console.log(`   Found ${validatedComplex.length} posts`);
  for (const post of validatedComplex) {
    console.log(`   - ${post.title} (${post.views} views)`);
    console.log(`     Author: ${post.author.name} (${post.author.role})`);
    console.log(`     Category: ${post.category?.name || 'None'}`);
    console.log(`     Tags: ${post.tags.map(t => t.name).join(', ')}`);
  }

  // Query 5: Simple query with just select (no relations)
  console.log('\n5️⃣  Simple query without relations...');
  
  const simpleUserQuery = userQuery({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  const allUsersData = await prisma.user.findMany({
    ...simpleUserQuery.query,
  });

  const allUsers = simpleUserQuery.array().parse(allUsersData);
  console.log(`   Found ${allUsers.length} users:`);
  for (const user of allUsers) {
    console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
  }
}

/**
 * Demonstrate update operations with Query Engine validation
 */
async function demonstrateUpdates() {
  console.log('\n📝 Demonstrating updates with Query Engine\n');

  // Update 1: Increment post views and validate result
  console.log('1️⃣  Incrementing post views...');
  const post = await prisma.post.findFirst({
    where: { slug: 'getting-started-with-zodipus' },
  });

  if (post) {
    const updateQuery = postQuery({
      select: {
        id: true,
        title: true,
        views: true,
        status: true,
      },
    });

    const updatedData = await prisma.post.update({
      where: { id: post.id },
      data: {
        views: { increment: 10 },
      },
      ...updateQuery.query,
    });

    const validated = updateQuery.parse(updatedData);
    console.log(`   Updated: "${validated.title}"`);
    console.log(`   Views: ${validated.views}`);
  }

  // Update 2: Update user settings with validation
  console.log('\n2️⃣  Updating user settings...');
  const userToUpdate = await prisma.user.findFirst({
    where: { email: 'john@example.com' },
  });

  if (userToUpdate) {
    const updateUserQuery = userQuery({
      select: {
        id: true,
        name: true,
        email: true,
        settings: true,
      },
    });

    const updatedData = await prisma.user.update({
      where: { id: userToUpdate.id },
      data: {
        settings: {
          theme: 'dark',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            inApp: false,
          },
        },
      },
      ...updateUserQuery.query,
    });

    const validated = updateUserQuery.parse(updatedData);
    console.log(`   Updated user: ${validated.name}`);
    console.log('   New settings:', validated.settings);
  }

  // Update 3: Publish draft post with relations
  console.log('\n3️⃣  Publishing draft post...');
  const draftPost = await prisma.post.findFirst({
    where: { status: 'DRAFT' },
  });

  if (draftPost) {
    const publishQuery = postQuery({
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
      },
      author: {
        select: {
          name: true,
        },
      },
    });

    const publishedData = await prisma.post.update({
      where: { id: draftPost.id },
      data: {
        published: true,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      ...publishQuery.query,
    });

    const validated = publishQuery.parse(publishedData);
    console.log(`   Published: "${validated.title}"`);
    console.log(`   Status: ${validated.status}`);
    console.log(`   Author: ${validated.author.name}`);
  }
}

/**
 * Demonstrate error handling with Query Engine
 */
async function demonstrateErrorHandling() {
  console.log('\n⚠️  Demonstrating Query Engine error handling\n');

  // Test 1: Invalid enum value in generated schema
  console.log('1️⃣  Testing invalid enum value...');
  try {
    UserRoleSchema.parse('INVALID_ROLE');
  } catch (error: any) {
    console.log('   ❌ Caught validation error (expected):');
    console.log(`      ${error.errors[0].message}`);
  }

  // Test 2: Invalid post status
  console.log('\n2️⃣  Testing invalid post status...');
  try {
    PostStatusSchema.parse('INVALID_STATUS');
  } catch (error: any) {
    console.log('   ❌ Caught validation error (expected):');
    console.log(`      ${error.errors[0].message}`);
  }

  // Test 3: Query Engine validates relation data
  console.log('\n3️⃣  Testing Query Engine validation...');
  
  const testQuery = userQuery({
    select: {
      id: true,
      email: true,
    },
    posts: true, // This will validate all post fields
  });

  // Simulate malformed data (this wouldn't come from Prisma, but demonstrates validation)
  try {
    testQuery.parse({
      id: '123',
      email: 'test@example.com',
      posts: [
        {
          id: 'post1',
          title: 'Test',
          // Missing required fields - Query Engine will catch this
          content: null,
          slug: 'test',
          published: true,
        },
      ],
    });
  } catch (_error: any) {
    console.log('   ❌ Caught validation error (expected):');
    console.log('      Query Engine validated nested relations');
  }

  // Test 4: Type safety at compile time
  console.log('\n4️⃣  Type safety demonstration...');
  const _typeSafeQuery = postQuery({
    select: {
      id: true,
      title: true,
      views: true,
    },
  });

  console.log('   ✅ Query Engine provides full TypeScript inference');
  console.log('   ✅ IntelliSense shows exact result shape');
  console.log('   ✅ Compile-time type checking prevents errors');
}

/**
 * Main function
 */
async function main() {
  console.log('🎭 Zodipus Query Engine - Type-Safe Database Queries\n');
  console.log('=' .repeat(60));

  try {
    // Seed the database
    await seedDatabase();
    
    console.log('=' .repeat(60));
    
    // Demonstrate queries
    await demonstrateQueries();
    
    console.log(`\n${'='.repeat(60)}`);
    
    // Demonstrate updates
    await demonstrateUpdates();
    
    console.log(`\n${'='.repeat(60)}`);
    
    // Demonstrate error handling
    await demonstrateErrorHandling();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n✨ All demonstrations completed successfully!');
    console.log('\n💡 Key takeaways about Zodipus Query Engine:');
    console.log('   ✅ Complete compile-time type safety for all queries');
    console.log('   ✅ Runtime validation with Zod for query results');
    console.log('   ✅ Automatic handling of nested relations');
    console.log('   ✅ Selective field picking with type inference');
    console.log('   ✅ Works seamlessly with Prisma queries');
    console.log('   ✅ Generated schemas and relations from Prisma schema');
    console.log('   ✅ Single query object spreads into Prisma calls');
    console.log('   ✅ Array parsing for batch operations\n');
    
  } catch (error) {
    console.error('\n❌ Error during execution:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
