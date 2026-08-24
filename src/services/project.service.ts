import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

export class ProjectService {
  static async getAllProjects(filters?: { search?: string; status?: string; activeOnly?: boolean }) {
    const where: any = {};

    if (filters?.activeOnly) {
      where.isActive = true;
      where.status = 'ACTIVE';
    } else if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      where.OR = [
        { projectCode: { contains: q } },
        { projectName: { contains: q } },
        { costCenterCode: { contains: q } },
        { location: { contains: q } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, username: true, fullName: true } },
        projectUnits: true,
        _count: {
          select: { transactions: true, userProjects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      ...p,
      id: Number(p.id),
      projectManagerId: p.projectManagerId ? Number(p.projectManagerId) : null,
      estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null,
      transactionsCount: p._count.transactions,
      unitsCount: p.projectUnits.length,
    }));
  }

  static async getProjectById(id: number) {
    const p = await prisma.project.findUnique({
      where: { id: BigInt(id) },
      include: {
        manager: { select: { id: true, username: true, fullName: true } },
        projectUnits: true,
        transactions: {
          where: { deletedAt: null },
          include: {
            beneficiary: true,
            category: true,
            paymentMethod: true,
          },
          orderBy: { id: 'desc' },
          take: 20,
        },
        userProjects: {
          include: {
            user: { select: { id: true, username: true, fullName: true } },
          },
        },
      },
    });

    if (!p) {
      throw new AppError('المشروع غير موجود في النظام', 404, 'PROJECT_NOT_FOUND');
    }

    return {
      ...p,
      id: Number(p.id),
      projectManagerId: p.projectManagerId ? Number(p.projectManagerId) : null,
      estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null,
    };
  }

  static async createProject(data: any, userId: number) {
    const existing = await prisma.project.findUnique({ where: { projectCode: data.projectCode } });
    if (existing) {
      throw new AppError(`رقم/كود المشروع (${data.projectCode}) مستخدم بالفعل`, 400, 'PROJECT_CODE_EXISTS');
    }

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          projectCode: data.projectCode,
          projectName: data.projectName,
          description: data.description || null,
          costCenterCode: data.costCenterCode || null,
          location: data.location || null,
          projectManagerId: data.projectManagerId ? BigInt(data.projectManagerId) : null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
          estimatedBudget: data.estimatedBudget ? data.estimatedBudget : null,
          status: data.status || 'ACTIVE',
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'PROJECT',
          entityId: created.id,
          action: 'CREATE_PROJECT',
          newValues: { projectCode: created.projectCode, projectName: created.projectName },
          reason: 'إنشاء مشروع جديد في النظام',
        },
      });

      return created;
    });

    return { ...project, id: Number(project.id) };
  }

  static async updateProject(id: number, data: any, userId: number) {
    const existing = await prisma.project.findUnique({ where: { id: BigInt(id) } });
    if (!existing) {
      throw new AppError('المشروع غير موجود في النظام', 404, 'PROJECT_NOT_FOUND');
    }

    if (data.projectCode && data.projectCode !== existing.projectCode) {
      const codeExists = await prisma.project.findUnique({ where: { projectCode: data.projectCode } });
      if (codeExists) {
        throw new AppError(`رقم/كود المشروع (${data.projectCode}) مستخدم بالفعل`, 400, 'PROJECT_CODE_EXISTS');
      }
    }

    const oldValues = {
      projectCode: existing.projectCode,
      costCenterCode: existing.costCenterCode,
      status: existing.status,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: BigInt(id) },
        data: {
          projectCode: data.projectCode || existing.projectCode,
          projectName: data.projectName || existing.projectName,
          description: data.description !== undefined ? data.description : existing.description,
          costCenterCode: data.costCenterCode !== undefined ? data.costCenterCode : existing.costCenterCode,
          location: data.location !== undefined ? data.location : existing.location,
          projectManagerId: data.projectManagerId ? BigInt(data.projectManagerId) : existing.projectManagerId,
          startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
          expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : existing.expectedEndDate,
          estimatedBudget: data.estimatedBudget !== undefined ? data.estimatedBudget : existing.estimatedBudget,
          status: data.status || existing.status,
          isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'PROJECT',
          entityId: p.id,
          action: 'UPDATE_PROJECT',
          oldValues,
          newValues: { projectCode: p.projectCode, costCenterCode: p.costCenterCode, status: p.status },
          reason: 'تعديل بيانات المشروع',
        },
      });

      return p;
    });

    return { ...updated, id: Number(updated.id) };
  }

  static async updateProjectStatus(id: number, status: string, isActive: boolean, userId: number) {
    const existing = await prisma.project.findUnique({ where: { id: BigInt(id) } });
    if (!existing) throw new AppError('المشروع غير موجود', 404, 'NOT_FOUND');

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: BigInt(id) },
        data: { status, isActive },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'PROJECT',
          entityId: p.id,
          action: 'UPDATE_PROJECT_STATUS',
          oldValues: { status: existing.status, isActive: existing.isActive },
          newValues: { status: p.status, isActive: p.isActive },
          reason: `تغيير حالة المشروع إلى ${status}`,
        },
      });

      return p;
    });

    return { ...updated, id: Number(updated.id) };
  }

  static async archiveProject(id: number, userId: number) {
    return this.updateProjectStatus(id, 'ARCHIVED', false, userId);
  }

  static async deleteProject(id: number) {
    const txCount = await prisma.expenseTransaction.count({
      where: { projectId: BigInt(id), deletedAt: null },
    });
    if (txCount > 0) {
      throw new AppError(`لا يمكن حذف المشروع لأنه مرتبط بـ ${txCount} سندات مصروفات. يمكن توقيفه أو أرشفته بدلاً من الحذف`, 400, 'PROJECT_HAS_TRANSACTIONS');
    }

    const unitCount = await prisma.projectUnit.count({
      where: { projectId: BigInt(id) },
    });
    if (unitCount > 0) {
      throw new AppError(`لا يمكن حذف المشروع لأنه يحتوي على ${unitCount} وحدات عقارية مرتبط بها`, 400, 'PROJECT_HAS_UNITS');
    }

    const deleted = await prisma.project.delete({ where: { id: BigInt(id) } });
    return { id: Number(deleted.id) };
  }

  static async getProjectTransactions(id: number) {
    const transactions = await prisma.expenseTransaction.findMany({
      where: { projectId: BigInt(id), deletedAt: null },
      include: {
        beneficiary: true,
        category: true,
        paymentMethod: true,
        projectUnit: true,
      },
      orderBy: { id: 'desc' },
    });
    return transactions;
  }

  static async getProjectSummary(id: number) {
    const project = await this.getProjectById(id);
    const transactions = await this.getProjectTransactions(id);

    const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const approvedSpent = transactions
      .filter((t) => t.status === 'APPROVED' || t.status === 'POSTED')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      project,
      metrics: {
        totalTransactions: transactions.length,
        totalSpent,
        approvedSpent,
        estimatedBudget: project.estimatedBudget,
        budgetRemaining: project.estimatedBudget ? project.estimatedBudget - approvedSpent : null,
      },
    };
  }

  // Project Units Management
  static async getUnitsByProject(projectId: number) {
    const units = await prisma.projectUnit.findMany({
      where: { projectId: BigInt(projectId) },
      orderBy: { unitNumber: 'asc' },
    });
    return units;
  }

  static async createUnit(projectId: number, data: any) {
    const existing = await prisma.projectUnit.findUnique({
      where: {
        projectId_unitNumber: {
          projectId: BigInt(projectId),
          unitNumber: data.unitNumber,
        },
      },
    });
    if (existing) {
      throw new AppError(`الوحدة رقم (${data.unitNumber}) موجودة بالفعل في هذا المشروع`, 400, 'UNIT_EXISTS');
    }

    const unit = await prisma.projectUnit.create({
      data: {
        projectId: BigInt(projectId),
        unitNumber: data.unitNumber,
        unitType: data.unitType,
        buildingNumber: data.buildingNumber || null,
        floorNumber: data.floorNumber || null,
        status: data.status || 'AVAILABLE',
      },
    });
    return { ...unit, id: Number(unit.id) };
  }

  static async updateUnit(id: number, data: any) {
    const unit = await prisma.projectUnit.update({
      where: { id: BigInt(id) },
      data,
    });
    return { ...unit, id: Number(unit.id) };
  }

  static async deleteUnit(id: number) {
    const txCount = await prisma.expenseTransaction.count({
      where: { projectUnitId: BigInt(id), deletedAt: null },
    });
    if (txCount > 0) {
      throw new AppError(`لا يمكن حذف الوحدة لأنها مرتبطة بـ ${txCount} عمليات سداد ومصروفات`, 400, 'UNIT_HAS_TRANSACTIONS');
    }

    const deleted = await prisma.projectUnit.delete({ where: { id: BigInt(id) } });
    return { id: Number(deleted.id) };
  }
}
