import { prisma } from '../config/database';
import { execSync } from 'child_process';

// Setup test database
beforeAll(async () => {
  // Run migrations for test database
  try {
    execSync('npx prisma migrate dev --name init', {
      cwd: __dirname,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }

  // Connect to database
  await prisma.$connect();
});

// Clean up database after each test
beforeEach(async () => {
  // Reset all tables
  const models = Reflect.ownKeys(prisma).filter(
    (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$')
  );

  for (const modelKey of models) {
    const model = (prisma as any)[modelKey];
    if (model && typeof model.deleteMany === 'function') {
      try {
        await model.deleteMany();
      } catch (error) {
        // Skip if model doesn't support deleteMany
      }
    }
  }
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/om_test';
process.env.CLERK_SECRET_KEY = 'test-secret-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
