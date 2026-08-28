import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

class TokenBlacklistService {
  // Store revoked token signatures with expiration timestamp
  private static blacklistedTokens: Map<string, number> = new Map();

  /**
   * Add a token to the revocation blacklist
   */
  static revokeToken(token: string): void {
    if (!token) return;

    try {
      // Decode without verification to extract expiration timestamp
      const decoded = jwt.decode(token) as { exp?: number };
      const expTime = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;

      this.blacklistedTokens.set(token, expTime);
      logger.info(`🛡️ [Token Blacklist] Token revoked successfully. Expiration: ${new Date(expTime).toISOString()}`);

      // Run garbage collection on expired tokens in blacklist
      this.cleanupExpiredTokens();
    } catch (error) {
      logger.error(`❌ [Token Blacklist Error] Failed to revoke token:`, error);
    }
  }

  /**
   * Check if a token has been revoked
   */
  static isBlacklisted(token: string): boolean {
    if (!token) return false;
    const expTime = this.blacklistedTokens.get(token);

    if (!expTime) return false;

    // If current time exceeded expiration, automatically purge and return false
    if (Date.now() > expTime) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Purge expired tokens from memory map to prevent memory leak
   */
  private static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, expTime] of this.blacklistedTokens.entries()) {
      if (now > expTime) {
        this.blacklistedTokens.delete(token);
      }
    }
  }
}

export { TokenBlacklistService };
