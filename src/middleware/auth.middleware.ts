import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendError } from '../utils/response';
import { prisma } from '../utils/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    fullName: string;
    roles: string[];
    permissions: string[];
  };
}

export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'رمز المصادقة مفقود أو غير صالحة', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as any;

    const user = await prisma.user.findUnique({
      where: { id: BigInt(payload.id) },
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
      return sendError(res, 'الحساب غير موجود أو معطل', 'UNAUTHORIZED', 401);
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      )
    );

    req.user = {
      id: Number(user.id),
      username: user.username,
      fullName: user.fullName,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    return sendError(res, 'رمز المصادقة منتهي الصلاحية أو غير صالح', 'UNAUTHORIZED', 401);
  }
}

export function requirePermission(permissionCode: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'المصادقة مطلوبة', 'UNAUTHORIZED', 401);
    }

    if (req.user.roles.includes('ADMIN')) {
      return next(); // Admin has override power
    }

    if (!req.user.permissions.includes(permissionCode)) {
      return sendError(res, 'ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء', 'FORBIDDEN', 403);
    }

    next();
  };
}

export function requireRole(roleName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'المصادقة مطلوبة', 'UNAUTHORIZED', 401);
    }

    if (!req.user.roles.includes(roleName) && !req.user.roles.includes('ADMIN')) {
      return sendError(res, 'ليس لديك الدور المناسب لتنفيذ هذا الإجراء', 'FORBIDDEN', 403);
    }

    next();
  };
}
