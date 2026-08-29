import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root if present, or local dir
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const missingVars: string[] = [];
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.includes('super-secret')) {
    missingVars.push('JWT_ACCESS_SECRET (must be set to a secure unique secret in production)');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.includes('super-secret')) {
    missingVars.push('JWT_REFRESH_SECRET (must be set to a secure unique secret in production)');
  }
  if (!process.env.DATABASE_URL) {
    missingVars.push('DATABASE_URL (must be explicitly defined in production)');
  }
  if (missingVars.length > 0) {
    console.error('❌ Critical Production Security Error: The following environment variables are missing or insecure:');
    missingVars.forEach((v) => console.error(`  - ${v}`));
    throw new Error(`Insecure production configuration: ${missingVars.join(', ')}`);
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || process.env.API_PORT || '5000', 10),
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
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@expense-system.com',
  },
};

