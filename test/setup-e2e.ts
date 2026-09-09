import { config } from 'dotenv';
import { resolve } from 'path';

// Loads .env.test BEFORE any test file or NestJS module reads process.env.
// This only works if AppModule's ConfigModule doesn't hardcode a different env file path.
config({ path: resolve(__dirname, './.env.test') });
jest.setTimeout(30000);