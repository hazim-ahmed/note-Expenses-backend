import { Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { sendSuccess } from '../utils/response';
import {
  UserCreateSchema,
  UserUpdateSchema,
  ResetPasswordSchema,
  UserRolesUpdateSchema,
  UserProjectsUpdateSchema,
  UserCashboxesUpdateSchema,
} from '../shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class UserController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const roleName = req.query.roleName as string;

      const users = await UserService.getAllUsers({ search, status, roleName });
      return sendSuccess(res, users, 'تم جلب قائمة المستخدمين بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await UserService.getUserById(id);
      return sendSuccess(res, user, 'تم جلب بيانات المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = UserCreateSchema.parse(req.body);
      const currentUserId = req.user!.id;
      const user = await UserService.createUser(validated, currentUserId);
      return sendSuccess(res, user, 'تم إضافة المستخدم بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = UserUpdateSchema.parse(req.body);
      const currentUserId = req.user!.id;
      const user = await UserService.updateUser(id, validated, currentUserId);
      return sendSuccess(res, user, 'تم تحديث بيانات المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async toggleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { isActive } = req.body;
      const currentUserId = req.user!.id;
      const result = await UserService.toggleUserStatus(id, isActive !== false, currentUserId);
      return sendSuccess(res, result, 'تم تحديث حالة حساب المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = ResetPasswordSchema.parse(req.body);
      const currentUserId = req.user!.id;
      await UserService.resetPassword(id, validated.newPassword, currentUserId);
      return sendSuccess(res, null, 'تم إعادة تعيين كلمة المرور بنجاح وتسجيل الإجراء في سجل التعديلات');
    } catch (error) {
      next(error);
    }
  }

  static async logoutAllSessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, null, 'تم إنهاء جميع جلسات المستخدم الحالية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateRoles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { roleIds } = UserRolesUpdateSchema.parse(req.body);
      const currentUserId = req.user!.id;
      const result = await UserService.updateUserRoles(id, roleIds, currentUserId);
      return sendSuccess(res, result, 'تم تحديث أدوار المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateProjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { projectIds } = UserProjectsUpdateSchema.parse(req.body);
      const currentUserId = req.user!.id;
      const result = await UserService.updateUserProjects(id, projectIds, currentUserId);
      return sendSuccess(res, result, 'تم ربط المشاريع بالمستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateCashboxes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { cashboxIds } = UserCashboxesUpdateSchema.parse(req.body);
      const currentUserId = req.user!.id;
      const result = await UserService.updateUserCashboxes(id, cashboxIds, currentUserId);
      return sendSuccess(res, result, 'تم ربط الصناديق بالمستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await UserService.deleteUser(id);
      return sendSuccess(res, result, 'تم حذف المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getRoles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roles = await UserService.getAllRoles();
      return sendSuccess(res, roles, 'تم جلب قائمة الأدوار بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
