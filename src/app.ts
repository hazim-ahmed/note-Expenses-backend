import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';
import { swaggerDocument } from './config/swagger';
import { BackupService } from './services/backup.service';

const app = express();

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { success: false, message: 'تم تجاوز حد الطلبات المسموح به، يرجى المحاولة لاحقاً', errorCode: 'RATE_LIMIT_EXCEEDED' },
});
app.use(limiter);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files
app.use('/uploads', express.static(config.upload.dir));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api/v1', routes);

import { HealthController } from './controllers/health.controller';

// Base Health Check & Deep Diagnostic Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health/deep', HealthController.getDeepHealth);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`🚀 Daily Expenses REST API running on port ${config.port}`);
    logger.info(`📖 Swagger API Docs available at http://localhost:${config.port}/api-docs`);
    BackupService.initializeScheduledBackup();
  });
}

export default app;
