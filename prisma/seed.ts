import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Roles & Fine-Grained Permissions
  const roles = ['ADMIN', 'CASHIER', 'ACCOUNTANT', 'MANAGER', 'VIEWER'];
  const createdRoles: Record<string, any> = {};

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Role for ${roleName}`,
      },
    });
    createdRoles[roleName] = role;
  }

  const permissions = [
    // Transactions & Journals
    { code: 'transactions:create', name: 'إنشاء سند صرف' },
    { code: 'transactions:read', name: 'استعراض سندات الصرف' },
    { code: 'transactions:update', name: 'تعديل سند الصرف' },
    { code: 'transactions:approve', name: 'اعتماد سند الصرف' },
    { code: 'transactions:reject', name: 'رفض سند الصرف' },
    { code: 'transactions:cancel', name: 'إلغاء سند الصرف' },
    { code: 'transactions:assign_project', name: 'ربط السند بمشروع' },
    { code: 'journals:create', name: 'فتح يومية جديدة' },
    { code: 'journals:approve', name: 'اعتماد اليومية' },
    { code: 'journals:close', name: 'إغلاق اليومية' },
    { code: 'journals:reopen', name: 'إعادة فتح اليومية' },

    // Projects Fine-Grained Permissions
    { code: 'projects.view', name: 'عرض المشاريع' },
    { code: 'projects.create', name: 'إنشاء مشروع جديد' },
    { code: 'projects.update', name: 'تعديل بيانات المشروع' },
    { code: 'projects.activate', name: 'تفعيل المشروع' },
    { code: 'projects.deactivate', name: 'تعطيل/إيقاف المشروع' },
    { code: 'projects.archive', name: 'أرشفة المشروع' },
    { code: 'projects.view_expenses', name: 'عرض مصروفات المشروع' },
    { code: 'projects.assign_transactions', name: 'تخصيص المعاملات للمشروع' },

    // Users Fine-Grained Permissions
    { code: 'users.view', name: 'عرض المستخدمين' },
    { code: 'users.create', name: 'إضافة مستخدم جديد' },
    { code: 'users.update', name: 'تعديل بيانات المستخدم' },
    { code: 'users.activate', name: 'تفعيل حساب المستخدم' },
    { code: 'users.deactivate', name: 'تعطيل حساب المستخدم' },
    { code: 'users.reset_password', name: 'إعادة تعيين كلمة المرور' },
    { code: 'users.assign_roles', name: 'إدارة أدوار المستخدم' },
    { code: 'users.assign_permissions', name: 'إدارة صلاحيات المستخدم' },
    { code: 'users.end_sessions', name: 'إنهاء جلسات المستخدم' },
    { code: 'users.view_activity', name: 'عرض نشاط المستخدم' },

    // System Settings & Reports
    { code: 'system_settings:read', name: 'عرض إعدادات النظام' },
    { code: 'system_settings:update', name: 'تغيير إعدادات النظام' },
    { code: 'users:manage', name: 'إدارة المستخدمين والصلاحيات العامة' },
    { code: 'reports:view', name: 'الاطلاع على التقارير' },
  ];

  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name },
      create: perm,
    });

    // Assign to ADMIN
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles['ADMIN'].id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: createdRoles['ADMIN'].id,
        permissionId: permission.id,
      },
    });
  }

  // 2. Default Admin User with ENV Password
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: {
      username: adminUsername,
      employeeNumber: 'EMP-001',
      fullName: 'مدير النظام الافتراضي',
      email: 'admin@expense-system.com',
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: createdRoles['ADMIN'].id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: createdRoles['ADMIN'].id,
    },
  });

  // 3. System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'expenses.project_requirement_mode' },
    update: {},
    create: {
      key: 'expenses.project_requirement_mode',
      value: 'OPTIONAL',
      description: 'وضع إلزامية ربط المصروف بالمشروع: OPTIONAL, REQUIRED_ON_APPROVAL, REQUIRED_ON_CREATE',
    },
  });

  // 4. Cashbox & Payment Methods
  const cashbox = await prisma.cashbox.upsert({
    where: { code: 'CASH-001' },
    update: {},
    create: {
      code: 'CASH-001',
      name: 'الصندوق الرئيسي',
      branchName: 'المركز الرئيسي',
      custodianUserId: adminUser.id,
      isActive: true,
    },
  });

  // Link Admin User to Main Cashbox
  await prisma.userCashbox.upsert({
    where: {
      userId_cashboxId: {
        userId: adminUser.id,
        cashboxId: cashbox.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      cashboxId: cashbox.id,
      canOpenJournal: true,
      canCreateTransaction: true,
      canSubmitJournal: true,
      canViewBalance: true,
      assignedBy: adminUser.id,
    },
  });

  const paymentMethods = [
    { code: 'CASH', name: 'نقداً (كاش)', requiresReference: false },
    { code: 'BANK_TRANSFER', name: 'تحويل بنكي', requiresReference: true },
    { code: 'CARD', name: 'بطاقة مدى / ائتمان', requiresReference: true },
    { code: 'CHEQUE', name: 'شيك', requiresReference: true },
    { code: 'PETTY_CASH', name: 'عهدة نقدية', requiresReference: false },
  ];

  const createdPaymentMethods: Record<string, any> = {};
  for (const pm of paymentMethods) {
    const item = await prisma.paymentMethod.upsert({
      where: { code: pm.code },
      update: {},
      create: pm,
    });
    createdPaymentMethods[pm.code] = item;
  }

  // 5. Expense Categories
  const categories = [
    { code: 'CAT-001', name: 'مواد بناء', requiresProject: true, requiresInvoice: true },
    { code: 'CAT-002', name: 'مواد عزل', requiresProject: true, requiresInvoice: true },
    { code: 'CAT-003', name: 'عمولات بيع', requiresProject: true, requiresInvoice: false },
    { code: 'CAT-004', name: 'مصروفات إدارية', requiresProject: false, requiresInvoice: false },
    { code: 'CAT-005', name: 'ضيافة ووجبات', requiresProject: false, requiresInvoice: false },
    { code: 'CAT-006', name: 'رسوم حكومية', requiresProject: false, requiresInvoice: true },
    { code: 'CAT-007', name: 'اتصالات', requiresProject: false, requiresInvoice: true },
    { code: 'CAT-008', name: 'صيانة', requiresProject: false, requiresInvoice: false },
    { code: 'CAT-009', name: 'أجور', requiresProject: false, requiresInvoice: false },
    { code: 'CAT-010', name: 'خدمات', requiresProject: false, requiresInvoice: true },
    { code: 'CAT-011', name: 'مصروفات أخرى', requiresProject: false, requiresInvoice: false },
  ];

  const createdCategories: Record<string, any> = {};
  for (const cat of categories) {
    const item = await prisma.expenseCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
    createdCategories[cat.name] = item;
  }

  // 6. Projects & Units
  const prj112 = await prisma.project.upsert({
    where: { projectCode: '112' },
    update: {},
    create: {
      projectCode: '112',
      projectName: 'مشروع 112',
      costCenterCode: 'CC-112',
      location: 'الرياض - حي الياسمين',
      status: 'ACTIVE',
      isActive: true,
      projectManagerId: adminUser.id,
    },
  });

  const prj113 = await prisma.project.upsert({
    where: { projectCode: '113' },
    update: {},
    create: {
      projectCode: '113',
      projectName: 'مشروع 113',
      costCenterCode: 'CC-113',
      location: 'الرياض - حي النرجس',
      status: 'ACTIVE',
      isActive: true,
      projectManagerId: adminUser.id,
    },
  });

  // Link Admin User to Projects
  await prisma.userProject.upsert({
    where: {
      userId_projectId: {
        userId: adminUser.id,
        projectId: prj112.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      projectId: prj112.id,
      accessLevel: 'FULL_ACCESS',
      assignedBy: adminUser.id,
    },
  });

  await prisma.userProject.upsert({
    where: {
      userId_projectId: {
        userId: adminUser.id,
        projectId: prj113.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      projectId: prj113.id,
      accessLevel: 'FULL_ACCESS',
      assignedBy: adminUser.id,
    },
  });

  const unit27 = await prisma.projectUnit.upsert({
    where: {
      projectId_unitNumber: {
        projectId: prj113.id,
        unitNumber: '27',
      },
    },
    update: {},
    create: {
      projectId: prj113.id,
      unitNumber: '27',
      unitType: 'APARTMENT',
      buildingNumber: 'مبنى أ',
      floorNumber: '3',
      status: 'AVAILABLE',
    },
  });

  // 7. Beneficiaries
  const beneficiariesList = [
    { name: 'شركة المنصوري للتجارة', type: 'COMPANY', commercialRegistration: '1010998877', taxNumber: '310099887700003' },
    { name: 'مؤسسة الجوهرة الحديثة', type: 'INSTITUTION', commercialRegistration: '1010554433', taxNumber: '310055443300003' },
    { name: 'صادق حسن', type: 'PERSON', phone: '0501112233' },
    { name: 'مجاهد إسماعيل', type: 'PERSON', phone: '0502223344' },
    { name: 'موظفو المكتب', type: 'OTHER' },
    { name: 'زكريا إسماعيل', type: 'EMPLOYEE', phone: '0505556677' },
  ];

  const createdBeneficiaries: Record<string, any> = {};
  for (const b of beneficiariesList) {
    const existing = await prisma.beneficiary.findFirst({ where: { name: b.name } });
    if (existing) {
      createdBeneficiaries[b.name] = existing;
    } else {
      const created = await prisma.beneficiary.create({
        data: {
          name: b.name,
          beneficiaryType: b.type,
          taxNumber: b.taxNumber,
          commercialRegistration: b.commercialRegistration,
          phone: b.phone,
        },
      });
      createdBeneficiaries[b.name] = created;
    }
  }

  // 8. Demo Journal for 2026-08-04 (Total 3819 SAR)
  const demoDate = new Date('2026-08-04');
  const journalNumber = 'JRN-20260804-001';

  let journal = await prisma.expenseJournal.findUnique({
    where: { journalNumber },
  });

  if (!journal) {
    journal = await prisma.expenseJournal.create({
      data: {
        journalNumber,
        journalDate: demoDate,
        cashboxId: cashbox.id,
        status: 'OPEN',
        openingBalance: 10000.00,
        preparedBy: adminUser.id,
        notes: 'يومية تجريبية بتاريخ 04 أغسطس 2026',
      },
    });
  }

  const demoTransactions = [
    {
      systemReference: 'EXP-2026-000001',
      voucherSource: 'MANUAL',
      manualVoucherNumber: '1001',
      voucherBookNumber: 'BK-01',
      voucherBookKey: 'BK-01',
      voucherDate: demoDate,
      transactionType: 'PURCHASE',
      beneficiaryId: createdBeneficiaries['شركة المنصوري للتجارة'].id,
      categoryId: createdCategories['مواد عزل'].id,
      projectId: prj112.id,
      paymentMethodId: createdPaymentMethods['CASH'].id,
      amount: 293.00,
      description: 'مواد عزل لمشروع 112',
      invoiceStatus: 'PROVIDED',
      invoiceNumber: 'INV-MN-991',
      invoiceDate: demoDate,
      invoiceAmount: 293.00,
      fiscalYear: 2026,
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
    {
      systemReference: 'EXP-2026-000002',
      voucherSource: 'MANUAL',
      manualVoucherNumber: '1002',
      voucherBookNumber: 'BK-01',
      voucherBookKey: 'BK-01',
      voucherDate: demoDate,
      transactionType: 'SERVICE',
      beneficiaryId: createdBeneficiaries['مؤسسة الجوهرة الحديثة'].id,
      categoryId: createdCategories['خدمات'].id,
      paymentMethodId: createdPaymentMethods['CASH'].id,
      amount: 1150.00,
      description: 'خدمة سلامة دفاع مدني',
      invoiceStatus: 'PROVIDED',
      invoiceNumber: 'INV-JW-441',
      invoiceDate: demoDate,
      invoiceAmount: 1150.00,
      fiscalYear: 2026,
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
    {
      systemReference: 'EXP-2026-000003',
      voucherSource: 'MANUAL',
      manualVoucherNumber: '1003',
      voucherBookNumber: 'BK-01',
      voucherBookKey: 'BK-01',
      voucherDate: demoDate,
      transactionType: 'GENERAL_EXPENSE',
      beneficiaryId: createdBeneficiaries['صادق حسن'].id,
      categoryId: createdCategories['مصروفات عامة']?.id || createdCategories['مصروفات أخرى'].id,
      paymentMethodId: createdPaymentMethods['CASH'].id,
      amount: 184.00,
      description: 'مصروف عام',
      invoiceStatus: 'NOT_REQUIRED',
      fiscalYear: 2026,
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
    {
      systemReference: 'EXP-2026-000004',
      voucherSource: 'MANUAL',
      manualVoucherNumber: '1004',
      voucherBookNumber: 'BK-01',
      voucherBookKey: 'BK-01',
      voucherDate: demoDate,
      transactionType: 'GENERAL_EXPENSE',
      beneficiaryId: createdBeneficiaries['مجاهد إسماعيل'].id,
      categoryId: createdCategories['مصروفات عامة']?.id || createdCategories['مصروفات أخرى'].id,
      paymentMethodId: createdPaymentMethods['CASH'].id,
      amount: 92.00,
      description: 'مصروف عام',
      invoiceStatus: 'NOT_REQUIRED',
      fiscalYear: 2026,
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
    {
      systemReference: 'EXP-2026-000005',
      voucherSource: 'MANUAL',
      manualVoucherNumber: '1005',
      voucherBookNumber: 'BK-01',
      voucherBookKey: 'BK-01',
      voucherDate: demoDate,
      transactionType: 'GENERAL_EXPENSE',
      beneficiaryId: createdBeneficiaries['موظفو المكتب'].id,
      categoryId: createdCategories['ضيافة ووجبات'].id,
      paymentMethodId: createdPaymentMethods['CASH'].id,
      amount: 100.00,
      description: 'غداء للمكتب',
      invoiceStatus: 'NOT_REQUIRED',
      fiscalYear: 2026,
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
    {
      systemReference: 'EXP-2026-000006',
      voucherSource: 'MANUAL',
      manualVoucherNumber: '1006',
      voucherBookNumber: 'BK-01',
      voucherBookKey: 'BK-01',
      voucherDate: demoDate,
      transactionType: 'COMMISSION',
      beneficiaryId: createdBeneficiaries['زكريا إسماعيل'].id,
      categoryId: createdCategories['عمولات بيع'].id,
      projectId: prj113.id,
      projectUnitId: unit27.id,
      paymentMethodId: createdPaymentMethods['CASH'].id,
      amount: 2000.00,
      description: 'عمولة شقة رقم 27',
      invoiceStatus: 'NOT_REQUIRED',
      fiscalYear: 2026,
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
  ];

  for (const tx of demoTransactions) {
    await prisma.expenseTransaction.upsert({
      where: { systemReference: tx.systemReference },
      update: {},
      create: {
        ...tx,
        journalId: journal.id,
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
  console.log(`👤 Admin created: Username = ${adminUsername}, Password = ${adminPassword}`);
  console.log('📊 Demo Journal created for 2026-08-04 with 6 transactions totaling 3819 SAR.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
