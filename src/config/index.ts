import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root if present, or local dir
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || process.env.API_PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:rootpassword@localhost:3306/expense_db',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-2026',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  upload: {
    dir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  },
};
