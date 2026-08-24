import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { AppError } from '../middleware/error.middleware';

export class AuthService {
  static generateTokens(user: { id: number; username: string; roles: string[] }) {
    const accessToken = jwt.sign(
      { id: user.id, username: user.username, roles: user.roles },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
  }

  static async login(username: string, password: string) {
    const cleanUsername = username ? username.trim() : '';

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      )
    );

    const userId = Number(user.id);
    const tokens = this.generateTokens({ id: userId, username: user.username, roles });

    return {
      user: {
        id: userId,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roles,
        permissions,
      },
      tokens,
    };
  }

  static async refreshToken(refreshTokenString: string) {
    try {
      const payload = jwt.verify(refreshTokenString, config.jwt.refreshSecret) as any;

      const user = await prisma.user.findUnique({
        where: { id: BigInt(payload.id) },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new AppError('المستخدم غير موجود أو غير نشط', 401, 'UNAUTHORIZED');
      }

      const roles = user.userRoles.map((ur) => ur.role.name);
      const userId = Number(user.id);

      const tokens = this.generateTokens({ id: userId, username: user.username, roles });
      return tokens;
    } catch (error) {
      throw new AppError('رمز التحديث غير صالح أو منتهي الصلاحية', 401, 'INVALID_REFRESH_TOKEN');
    }
  }
}
