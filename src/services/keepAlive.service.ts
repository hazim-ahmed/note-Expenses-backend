import http from 'http';
import https from 'https';
import { config } from '../config';
import { logger } from '../utils/logger';

export class KeepAliveService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Starts the randomized background keep-alive loop (ping interval: 5 to 10 minutes)
   */
  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('🚀 [KeepAlive] Randomized Self-Pinger Engine Initialized (5 - 10 min random interval).');
    this.scheduleNextPing();
  }

  static stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('🛑 [KeepAlive] Self-Pinger Engine Stopped.');
  }

  private static scheduleNextPing() {
    // Generate random minutes between 5 and 10 + random seconds
    const randomMinutes = Math.random() * (10 - 5) + 5; // e.g. 5.34 minutes
    const randomMs = Math.floor(randomMinutes * 60 * 1000);

    const minutesFormatted = randomMinutes.toFixed(2);
    logger.info(`⏰ [KeepAlive] Next ping scheduled in ${minutesFormatted} minutes (${Math.round(randomMs / 1000)} seconds).`);

    this.timer = setTimeout(() => {
      this.executePing();
    }, randomMs);
  }

  private static executePing() {
    const targetUrl = process.env.PUBLIC_SERVICE_URL || `http://127.0.0.1:${config.port}/api/v1/system-status`;
    
    try {
      const isHttps = targetUrl.startsWith('https');
      const client = isHttps ? https : http;

      const req = client.get(targetUrl, { timeout: 10000 }, (res) => {
        if (res.statusCode === 200) {
          logger.info(`✅ [KeepAlive] Self-ping successful to ${targetUrl} (Status: 200 OK)`);
        } else {
          logger.warn(`⚠️ [KeepAlive] Self-ping responded with status code: ${res.statusCode}`);
        }
        res.resume(); // Consume response stream to free memory
        this.scheduleNextPing();
      });

      req.on('error', (err) => {
        logger.error(`❌ [KeepAlive] Self-ping error: ${err.message}`);
        this.scheduleNextPing();
      });

      req.on('timeout', () => {
        req.destroy();
        logger.warn('⚠️ [KeepAlive] Self-ping request timed out after 10s.');
        this.scheduleNextPing();
      });
    } catch (error: any) {
      logger.error(`❌ [KeepAlive] Exception during self-ping: ${error.message}`);
      this.scheduleNextPing();
    }
  }
}
