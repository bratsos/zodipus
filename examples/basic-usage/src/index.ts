import { PrismaClient } from '@prisma/client';
import {
  CategorySchema,
  PostSchema,
  PostStatusSchema,
  UserRoleSchema,
  UserSchema,
  modelRelations,
} from './generated/generated-index';

const prisma = new PrismaClient();

async function main() {
  console.log('🎭 Zodipus Example - Basic Usage\n');

  // Example 1: Validate enum values
  console.log('📋 Example 1: Enum Validation');
  try {
    const validRole = UserRoleSchema.parse('ADMIN');
    console.log('✅ Valid role:', validRole);

    const validStatus = PostStatusSchema.parse('PUBLISHED');
    console.log('✅ Valid status:', validStatus);
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  // Example 2: Validate user data
  console.log('\n📋 Example 2: User Data Validation');
  try {
    const userData = UserSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'USER',
      settings: {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          push: false,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Valid user data:', userData);
    console.log('   - Theme:', userData.settings?.theme);
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  // Example 3: Validate post data with metadata
  console.log('\n📋 Example 3: Post Data with Custom JSON Schema');
  try {
    const postData = PostSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Getting Started with Zodipus',
      content: 'Zodipus makes Prisma schema validation a breeze...',
      slug: 'getting-started-with-zodipus',
      published: true,
      status: 'PUBLISHED',
      views: 42,
      authorId: '123e4567-e89b-12d3-a456-426614174000',
      metadata: {
        seo: {
          title: 'Getting Started with Zodipus - Complete Guide',
          description: 'Learn how to use Zodipus for type-safe Prisma validation',
          keywords: ['zodipus', 'prisma', 'zod', 'typescript'],
        },
        featuredImage: {
          url: 'https://example.com/image.jpg',
          alt: 'Zodipus logo',
          width: 1200,
          height: 630,
        },
        readTime: 5,
      },
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Valid post data:', postData);
    console.log('   - SEO Title:', postData.metadata?.seo?.title);
    console.log('   - Read time:', postData.metadata?.readTime, 'minutes');
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  // Example 4: Partial validation for updates
  console.log('\n📋 Example 4: Partial Schema for Updates');
  const UpdatePostSchema = PostSchema.partial();
  try {
    const updateData = UpdatePostSchema.parse({
      title: 'Updated Title',
      views: 100,
    });
    console.log('✅ Valid update data:', updateData);
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  // Example 5: Array validation
  console.log('\n📋 Example 5: Array Validation');
  const CategoriesSchema = CategorySchema.array();
  try {
    const categories = CategoriesSchema.parse([
      {
        id: '1',
        name: 'Technology',
        slug: 'technology',
        description: 'Tech posts',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Design',
        slug: 'design',
        description: 'Design posts',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✅ Valid categories:', categories.length, 'items');
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  // Example 6: Exploring relation metadata
  console.log('\n📋 Example 6: Relation Metadata');
  console.log('User relations:', Object.keys(modelRelations.user || {}));
  console.log('Post relations:', Object.keys(modelRelations.post || {}));
  
  if (modelRelations.user?.posts) {
    console.log('User->Posts relation:', {
      type: modelRelations.user.posts.type,
      isArray: modelRelations.user.posts.isArray,
    });
  }

  // Example 7: Invalid data handling
  console.log('\n📋 Example 7: Invalid Data Handling');
  try {
    UserSchema.parse({
      id: '123',
      email: 'not-an-email', // This will pass basic string validation
      role: 'INVALID_ROLE', // This will fail enum validation
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error: any) {
    console.log('❌ Expected validation error caught:');
    if (error.errors) {
      error.errors.forEach((err: any) => {
        console.log(`   - ${err.path.join('.')}: ${err.message}`);
      });
    }
  }

  console.log('\n✨ All examples completed!');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
