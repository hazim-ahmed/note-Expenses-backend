import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

export class UserService {
  static sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return {
      ...sanitized,
      id: Number(sanitized.id),
      roles: user.userRoles ? user.userRoles.map((ur: any) => ur.role.name) : [],
      userProjects: user.userProjects
        ? user.userProjects.map((up: any) => ({
            id: Number(up.id),
            projectId: Number(up.projectId),
            projectCode: up.project?.projectCode,
            projectName: up.project?.projectName,
            accessLevel: up.accessLevel,
          }))
        : [],
      userCashboxes: user.userCashboxes
        ? user.userCashboxes.map((uc: any) => ({
            id: Number(uc.id),
            cashboxId: Number(uc.cashboxId),
            cashboxName: uc.cashbox?.name,
            canOpenJournal: uc.canOpenJournal,
            canCreateTransaction: uc.canCreateTransaction,
            canSubmitJournal: uc.canSubmitJournal,
          }))
        : [],
    };
  }

  static async getAllUsers(filters?: { search?: string; status?: string; roleName?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.roleName) {
      where.userRoles = {
        some: {
          role: { name: filters.roleName },
        },
      };
    }

    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      where.OR = [
        { username: { contains: q } },
        { fullName: { contains: q } },
        { employeeNumber: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        userRoles: { include: { role: true } },
        userProjects: { include: { project: true } },
        userCashboxes: { include: { cashbox: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => this.sanitizeUser(u));
  }

  static async getUserById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        userProjects: { include: { project: true } },
        userCashboxes: { include: { cashbox: true } },
      },
    });

    if (!user) {
      throw new AppError('المستخدم غير موجود في النظام', 404, 'USER_NOT_FOUND');
    }

    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      )
    );

    const sanitized = this.sanitizeUser(user);
    return {
      ...sanitized,
      permissions,
    };
  }

  static async createUser(data: any, currentUserId: number) {
    // 1. Check unique username
    const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUsername) {
      throw new AppError(`اسم المستخدم (${data.username}) مستخدم بالفعل`, 400, 'USERNAME_TAKEN');
    }

    // 2. Check unique employee number if provided
    if (data.employeeNumber && data.employeeNumber.trim() !== '') {
      const existingEmp = await prisma.user.findUnique({ where: { employeeNumber: data.employeeNumber.trim() } });
      if (existingEmp) {
        throw new AppError(`رقم الموظف (${data.employeeNumber}) مستخدم بالفعل`, 400, 'EMPLOYEE_NUMBER_TAKEN');
      }
    }

    // 3. Check unique email if provided
    if (data.email && data.email.trim() !== '') {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email.trim() } });
      if (existingEmail) {
        throw new AppError(`البريد الإلكتروني (${data.email}) مستخدم بالفعل`, 400, 'EMAIL_TAKEN');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const inputRoleIds = (data.roleIds || []).map((id: any) => BigInt(id));
    const inputRoleNames = data.roleNames || [];

    // Find actual roles from DB
    const matchingRoles = await prisma.role.findMany({
      where: {
        OR: [
          inputRoleIds.length > 0 ? { id: { in: inputRoleIds } } : undefined,
          inputRoleNames.length > 0 ? { name: { in: inputRoleNames } } : undefined,
        ].filter(Boolean) as any,
      },
    });

    // Fallback: if no roles passed or found, default to CASHIER or VIEWER
    let finalRoleIds = matchingRoles.map((r) => r.id);
    if (finalRoleIds.length === 0) {
      const defaultRole = await prisma.role.findFirst({ where: { name: 'CASHIER' } });
      if (defaultRole) finalRoleIds = [defaultRole.id];
    }

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: data.username.trim(),
          employeeNumber: data.employeeNumber ? data.employeeNumber.trim() : null,
          fullName: data.fullName.trim(),
          email: data.email ? data.email.trim() : null,
          phone: data.phone ? data.phone.trim() : null,
          passwordHash,
          isActive: data.status !== 'INACTIVE',
          status: data.status || 'ACTIVE',
          mustChangePassword: Boolean(data.mustChangePassword),
          userRoles: {
            create: finalRoleIds.map((rId) => ({ roleId: rId })),
          },
        },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      // Link projects if provided
      if (data.projectIds && data.projectIds.length > 0) {
        for (const pId of data.projectIds) {
          await tx.userProject.create({
            data: {
              userId: created.id,
              projectId: BigInt(pId),
              accessLevel: 'FULL_ACCESS',
              assignedBy: BigInt(currentUserId),
            },
          });
        }
      }

      // Link cashboxes if provided
      if (data.cashboxIds && data.cashboxIds.length > 0) {
        for (const cbId of data.cashboxIds) {
          await tx.userCashbox.create({
            data: {
              userId: created.id,
              cashboxId: BigInt(cbId),
              canOpenJournal: true,
              canCreateTransaction: true,
              canSubmitJournal: true,
              canViewBalance: true,
              assignedBy: BigInt(currentUserId),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: BigInt(currentUserId),
          entityType: 'USER',
          entityId: created.id,
          action: 'CREATE_USER',
          newValues: { username: created.username, fullName: created.fullName },
          reason: 'إنشاء حساب مستخدم جديد',
        },
      });

      return created;
    });

    return this.getUserById(Number(newUser.id));
  }

  static async updateUser(id: number, data: any, currentUserId: number) {
    const user = await prisma.user.findUnique({ where: { id: BigInt(id) } });
    if (!user) throw new AppError('المستخدم غير موجود', 404, 'USER_NOT_FOUND');

    if (data.employeeNumber && data.employeeNumber !== user.employeeNumber) {
      const empExist = await prisma.user.findUnique({ where: { employeeNumber: data.employeeNumber } });
      if (empExist) throw new AppError('رقم الموظف مستخدم بالفعل', 400, 'EMPLOYEE_NUMBER_TAKEN');
    }

    if (data.email && data.email !== user.email) {
      const emailExist = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailExist) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400, 'EMAIL_TAKEN');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.user.update({
        where: { id: BigInt(id) },
        data: {
          fullName: data.fullName || user.fullName,
          employeeNumber: data.employeeNumber !== undefined ? data.employeeNumber : user.employeeNumber,
          email: data.email !== undefined ? data.email : user.email,
          phone: data.phone !== undefined ? data.phone : user.phone,
          mustChangePassword: data.mustChangePassword !== undefined ? data.mustChangePassword : user.mustChangePassword,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(currentUserId),
          entityType: 'USER',
          entityId: BigInt(id),
          action: 'UPDATE_USER',
          reason: 'تعديل بيانات الملف الشخصي للمستخدم',
        },
      });

      return res;
    });

    return this.getUserById(id);
  }

  static async toggleUserStatus(id: number, isActive: boolean, currentUserId: number) {
    // 1. Prevent self deactivation
    if (id === currentUserId && !isActive) {
      throw new AppError('لا يمكنك تعطيل حسابك الشخصي الحساس أثناء تسجبل الدخول به', 400, 'CANNOT_DEACTIVATE_SELF');
    }

    // 2. Prevent deactivating the last active Admin
    if (!isActive) {
      const user = await prisma.user.findUnique({
        where: { id: BigInt(id) },
        include: { userRoles: { include: { role: true } } },
      });

      const isAdmin = user?.userRoles.some((ur) => ur.role.name === 'ADMIN');
      if (isAdmin) {
        const activeAdminsCount = await prisma.user.count({
          where: {
            isActive: true,
            userRoles: {
              some: { role: { name: 'ADMIN' } },
            },
          },
        });

        if (activeAdminsCount <= 1) {
          throw new AppError('لا يمكنك تعطيل آخر مدير (ADMIN) فعّال في النظام لحماية وصول الإدارة', 400, 'LAST_ADMIN_PROTECTION');
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const status = isActive ? 'ACTIVE' : 'INACTIVE';
      const u = await tx.user.update({
        where: { id: BigInt(id) },
        data: { isActive, status },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(currentUserId),
          entityType: 'USER',
          entityId: BigInt(id),
          action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
          reason: isActive ? 'تفعيل حساب المستخدم' : 'تعطيل حساب المستخدم وإبطال جلساته',
        },
      });

      return u;
    });

    return { id: Number(updated.id), isActive: updated.isActive, status: updated.status };
  }

  static async resetPassword(id: number, newPassword: string, currentUserId: number) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: BigInt(id) },
        data: { passwordHash, mustChangePassword: true },
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(currentUserId),
          entityType: 'USER',
          entityId: BigInt(id),
          action: 'RESET_PASSWORD',
          reason: 'إعادة تعيين كلمة مرور المستخدم دون تدوين النص المباشر',
        },
      });
    });

    return { success: true };
  }

  static async deleteUser(id: number) {
    // Check financial links
    const preparedCount = await prisma.expenseJournal.count({ where: { preparedBy: BigInt(id) } });
    const createdTxCount = await prisma.expenseTransaction.count({ where: { createdBy: BigInt(id) } });
    const approvedTxCount = await prisma.expenseTransaction.count({ where: { approvedBy: BigInt(id) } });

    if (preparedCount > 0 || createdTxCount > 0 || approvedTxCount > 0) {
      throw new AppError('لا يسمح بحذف مستخدم مرتبط بسجلات أو اعتمادات أو يوميات مالية. يجب تعطيل الحساب بدلاً من الحذف', 400, 'USER_HAS_FINANCIAL_RECORDS');
    }

    const deleted = await prisma.user.delete({ where: { id: BigInt(id) } });
    return { id: Number(deleted.id) };
  }

  // Roles, Projects, & Cashboxes linkages
  static async updateUserRoles(userId: number, roleIds: number[], currentUserId: number) {
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    if (adminRole) {
      const userHasAdmin = await prisma.userRole.findFirst({
        where: { userId: BigInt(userId), roleId: adminRole.id },
      });
      const newRolesIncludeAdmin = roleIds.some((rId) => BigInt(rId) === adminRole.id);

      if (userHasAdmin && !newRolesIncludeAdmin) {
        const activeAdminsCount = await prisma.userRole.count({
          where: {
            roleId: adminRole.id,
            user: { isActive: true },
          },
        });
        if (activeAdminsCount <= 1) {
          throw new AppError('لا يمكنك إزالة صلاحية المدير (ADMIN) عن آخر مدير فعّال في النظام لحماية وصول الإدارة', 400, 'LAST_ADMIN_PROTECTION');
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: BigInt(userId) } });
      await tx.userRole.createMany({
        data: roleIds.map((rId) => ({ userId: BigInt(userId), roleId: BigInt(rId) })),
      });

      await tx.auditLog.create({
        data: {
          userId: BigInt(currentUserId),
          entityType: 'USER',
          entityId: BigInt(userId),
          action: 'ASSIGN_ROLES',
          reason: 'تحديث أدوار المستخدم',
        },
      });
    });

    return this.getUserById(userId);
  }

  static async updateUserProjects(userId: number, projectIds: number[], currentUserId: number) {
    await prisma.$transaction(async (tx) => {
      await tx.userProject.deleteMany({ where: { userId: BigInt(userId) } });
      for (const pId of projectIds) {
        await tx.userProject.create({
          data: {
            userId: BigInt(userId),
            projectId: BigInt(pId),
            accessLevel: 'FULL_ACCESS',
            assignedBy: BigInt(currentUserId),
          },
        });
      }
    });
    return this.getUserById(userId);
  }

  static async updateUserCashboxes(userId: number, cashboxIds: number[], currentUserId: number) {
    await prisma.$transaction(async (tx) => {
      await tx.userCashbox.deleteMany({ where: { userId: BigInt(userId) } });
      for (const cbId of cashboxIds) {
        await tx.userCashbox.create({
          data: {
            userId: BigInt(userId),
            cashboxId: BigInt(cbId),
            canOpenJournal: true,
            canCreateTransaction: true,
            canSubmitJournal: true,
            canViewBalance: true,
            assignedBy: BigInt(currentUserId),
          },
        });
      }
    });
    return this.getUserById(userId);
  }
}
