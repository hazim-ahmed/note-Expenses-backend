import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendError } from '../utils/response';
import { prisma } from '../utils/prisma';
import { TokenBlacklistService } from '../services/tokenBlacklist.service';

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

  // Check if token was revoked via logout
  if (TokenBlacklistService.isBlacklisted(token)) {
    return sendError(res, 'رمز المصادقة تم إلغاؤه (تم تسجيل الخروج)', 'UNAUTHORIZED', 401);
  }

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
    const permissions: string[] = Array.from(
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

    const roles = req.user.roles.map((r) => r.toUpperCase());

    // 1. ADMIN has complete system override
    if (roles.includes('ADMIN')) {
      return next();
    }

    // 2. ACCOUNTANT role permissions (Full Audit, Approval, Rejection, Project Assignment, Journal Closing & Reports)
    const accountantPermissions = [
      'transactions:approve',
      'transactions:reject',
      'transactions:assign_project',
      'transactions:update',
      'transactions:create',
      'transactions:read',
      'journals:approve',
      'journals:close',
      'journals:create',
      'journals:reopen',
      'reports:view',
      'projects.view',
      'projects.view_expenses',
      'projects.assign_transactions',
    ];

    if (roles.includes('ACCOUNTANT') && accountantPermissions.includes(permissionCode)) {
      return next();
    }

    // 3. MANAGER role permissions (Approval, Projects Management, Reports)
    const managerPermissions = [
      'transactions:approve',
      'transactions:reject',
      'transactions:assign_project',
      'transactions:update',
      'transactions:create',
      'transactions:read',
      'journals:approve',
      'journals:close',
      'journals:create',
      'reports:view',
      'projects.view',
      'projects.create',
      'projects.update',
      'projects.view_expenses',
      'projects.assign_transactions',
    ];

    if (roles.includes('MANAGER') && managerPermissions.includes(permissionCode)) {
      return next();
    }

    // 4. Standard User / Cashier baseline permissions
    const defaultUserPermissions = [
      'transactions:create',
      'transactions:read',
      'projects.view',
      'projects.view_expenses',
    ];

    if (
      req.user.permissions.includes(permissionCode) ||
      defaultUserPermissions.includes(permissionCode)
    ) {
      return next();
    }

    return sendError(res, 'ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء', 'FORBIDDEN', 403);
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
