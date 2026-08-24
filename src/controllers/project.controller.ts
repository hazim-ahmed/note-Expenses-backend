import { Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { sendSuccess } from '../utils/response';
import { ProjectCreateSchema, ProjectUpdateSchema, ProjectUnitCreateSchema } from '../shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ProjectController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const activeOnly = req.query.activeOnly === 'true';

      const projects = await ProjectService.getAllProjects({ search, status, activeOnly });
      return sendSuccess(res, projects, 'تم جلب قائمة المشاريع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const project = await ProjectService.getProjectById(id);
      return sendSuccess(res, project, 'تم جلب بيانات المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = ProjectCreateSchema.parse(req.body);
      const userId = req.user!.id;
      const project = await ProjectService.createProject(validated, userId);
      return sendSuccess(res, project, 'تم إنشاء المشروع بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = ProjectUpdateSchema.parse(req.body);
      const userId = req.user!.id;
      const project = await ProjectService.updateProject(id, validated, userId);
      return sendSuccess(res, project, 'تم تحديث بيانات المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, isActive } = req.body;
      const userId = req.user!.id;
      const result = await ProjectService.updateProjectStatus(id, status || 'ACTIVE', isActive !== false, userId);
      return sendSuccess(res, result, 'تم تحديث حالة المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const result = await ProjectService.archiveProject(id, userId);
      return sendSuccess(res, result, 'تم أرشفة المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await ProjectService.deleteProject(id);
      return sendSuccess(res, result, 'تم حذف المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const transactions = await ProjectService.getProjectTransactions(id);
      return sendSuccess(res, transactions, 'تم جلب مصروفات المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const summary = await ProjectService.getProjectSummary(id);
      return sendSuccess(res, summary, 'تم جلب الملخص المالي للمشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  // Units
  static async getUnits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const units = await ProjectService.getUnitsByProject(projectId);
      return sendSuccess(res, units, 'تم جلب وحدات المشروع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async createUnit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const validated = ProjectUnitCreateSchema.parse(req.body);
      const unit = await ProjectService.createUnit(projectId, validated);
      return sendSuccess(res, unit, 'تم إضافة الوحدة العقارية بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateUnit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const unit = await ProjectService.updateUnit(id, req.body);
      return sendSuccess(res, unit, 'تم تحديث بيانات الوحدة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async deleteUnit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await ProjectService.deleteUnit(id);
      return sendSuccess(res, result, 'تم حذف الوحدة بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
