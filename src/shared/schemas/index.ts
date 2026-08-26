import { z } from 'zod';
import {
  ProjectRequirementMode,
  VoucherSource,
  TransactionType,
  InvoiceStatus,
  BeneficiaryType,
  ProjectStatus,
  AttachmentType,
} from '../constants';

export const LoginSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'رمز التحديث مطلوب'),
});

export const SystemSettingUpdateSchema = z.object({
  value: z.nativeEnum(ProjectRequirementMode, {
    errorMap: () => ({ message: 'القيمة المدخلة لإلزامية المشروع غير صالحة' }),
  }),
});

export const AssignProjectSchema = z.object({
  projectId: z.number().int().positive('رقم المشروع غير صالح'),
  projectUnitId: z.number().int().positive().nullable().optional(),
  reason: z.string().min(3, 'سبب الربط مطلوب'),
});

export const BulkAssignProjectSchema = z.object({
  transactionIds: z.array(z.number().int().positive()).min(1, 'اختر عملية واحدة على الأقل'),
  projectId: z.number().int().positive('رقم المشروع غير صالح'),
  projectUnitId: z.number().int().positive().nullable().optional(),
  reason: z.string().min(3, 'سبب الربط مطلوب'),
});

// ─────────────────────────────────────────
// Projects & Units Schemas
// ─────────────────────────────────────────
export const ProjectCreateSchema = z.object({
  projectCode: z.string().min(1, 'رقم المشروع إجباري وفريد'),
  projectName: z.string().min(2, 'اسم المشروع إجباري'),
  description: z.string().nullable().optional(),
  costCenterCode: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  projectManagerId: z.number().int().positive().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  expectedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  estimatedBudget: z.number().positive().nullable().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED', 'CANCELLED']).default('ACTIVE'),
  isActive: z.boolean().default(true),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const ProjectStatusUpdateSchema = z.object({
  status: z.enum(['PLANNED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED', 'CANCELLED']),
  isActive: z.boolean().optional(),
});

export const ProjectUnitCreateSchema = z.object({
  unitNumber: z.string().min(1, 'رقم الوحدة إجباري'),
  unitType: z.string().min(1, 'نوع الوحدة إجباري'),
  buildingNumber: z.string().nullable().optional(),
  floorNumber: z.string().nullable().optional(),
  status: z.enum(['AVAILABLE', 'SOLD', 'RENTED', 'UNDER_MAINTENANCE']).default('AVAILABLE'),
});

export const ProjectUnitUpdateSchema = ProjectUnitCreateSchema.partial();

// ─────────────────────────────────────────
// Users & Assignments Schemas
// ─────────────────────────────────────────
export const UserCreateSchema = z.object({
  employeeNumber: z.string().nullable().optional(),
  fullName: z.string().min(3, 'الاسم الكامل مطلوب'),
  username: z.string().min(3, 'اسم المستخدم إجباري وفريد'),
  email: z.string().email('البريد الإلكتروني غير صالح').nullable().optional(),
  phone: z.string().nullable().optional(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  roleIds: z.array(z.number().int().positive()).optional(),
  roleNames: z.array(z.string()).optional(),
  projectIds: z.array(z.number().int().positive()).optional(),
  cashboxIds: z.array(z.number().int().positive()).optional(),
  mustChangePassword: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
});

export const UserUpdateSchema = UserCreateSchema.partial().omit({ password: true });

export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export const UserRolesUpdateSchema = z.object({
  roleIds: z.array(z.number().int().positive(), {
    required_error: 'يجب تحديد مصفوفة معرفات الأدوار',
  }),
});

export const UserProjectsUpdateSchema = z.object({
  projectIds: z.array(z.number().int().positive(), {
    required_error: 'يجب تحديد مصفوفة معرفات المشاريع',
  }),
});

export const UserCashboxesUpdateSchema = z.object({
  cashboxIds: z.array(z.number().int().positive(), {
    required_error: 'يجب تحديد مصفوفة معرفات الصناديق',
  }),
});

// ─────────────────────────────────────────
// Master Data Schemas (Beneficiaries, Categories, Cashboxes)
// ─────────────────────────────────────────
export const BeneficiaryCreateSchema = z.object({
  name: z.string().trim().min(2, 'اسم المستفيد يجب أن يكون حرفين على الأقل'),
  beneficiaryType: z.enum(['COMPANY', 'INSTITUTION', 'PERSON', 'EMPLOYEE', 'OTHER']).default('OTHER'),
  commercialName: z.string().trim().nullable().optional(),
  taxNumber: z.string().trim().nullable().optional(),
  commercialRegistration: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email('البريد الإلكتروني غير صالح').nullable().optional().or(z.literal('')),
  iban: z.string().trim().nullable().optional(),
  bankName: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const BeneficiaryUpdateSchema = BeneficiaryCreateSchema.partial();

export const ExpenseCategoryCreateSchema = z.object({
  code: z.string().trim().min(1, 'كود التصنيف مطلوب'),
  name: z.string().trim().min(2, 'اسم التصنيف مطلوب'),
  parentId: z.number().int().positive().nullable().optional(),
  accountingAccountCode: z.string().trim().nullable().optional(),
  requiresProject: z.boolean().default(false),
  requiresInvoice: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const ExpenseCategoryUpdateSchema = ExpenseCategoryCreateSchema.partial();

export const CashboxCreateSchema = z.object({
  code: z.string().trim().min(1, 'كود الصندوق مطلوب وفريد'),
  name: z.string().trim().min(2, 'اسم الصندوق مطلوب'),
  branchName: z.string().trim().nullable().optional(),
  custodianUserId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const CashboxUpdateSchema = CashboxCreateSchema.partial();

// ─────────────────────────────────────────
// Transactions Schemas
// ─────────────────────────────────────────
export const ExpenseTransactionCreateSchema = z.object({
  journalId: z.number().int().positive('رقم اليومية مطلوب'),
  voucherSource: z.nativeEnum(VoucherSource).default(VoucherSource.MANUAL),
  manualVoucherNumber: z.string().nullable().optional(),
  voucherBookNumber: z.string().nullable().optional(),
  voucherDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'),
  transactionType: z.nativeEnum(TransactionType),
  beneficiaryId: z.number().int().positive().nullable().optional(),
  beneficiaryName: z.string().nullable().optional(),
  categoryId: z.number().int().positive('التصنيف مطلوب'),
  projectId: z.number().int().positive().nullable().optional(),
  projectUnitId: z.number().int().positive().nullable().optional(),
  paymentMethodId: z.number().int().positive('طريقة الدفع مطلوبة'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  description: z.string().min(3, 'الوصف مطلوب'),
  invoiceStatus: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.NOT_REQUIRED),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  invoiceAmount: z.number().positive().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.voucherSource === VoucherSource.MANUAL && (!data.manualVoucherNumber || data.manualVoucherNumber.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'رقم السند اليدوي مطلوب عندما يكون مصدر السند يدوياً',
      path: ['manualVoucherNumber'],
    });
  }

  if (data.transactionType === TransactionType.PURCHASE && data.invoiceStatus === InvoiceStatus.PROVIDED) {
    if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'رقم الفاتورة مطلوب عند توفر الفاتورة في عمليات الشراء',
        path: ['invoiceNumber'],
      });
    }
  }
});

export const TodayTransactionCreateSchema = z.object({
  manualVoucherNumber: z.string().trim().min(1).nullable().optional(),
  beneficiaryId: z.number().int().positive().nullable().optional(),
  beneficiaryName: z.string().trim().min(2).nullable().optional(),
  categoryId: z.number().int().positive('التصنيف مطلوب'),
  projectId: z.number().int().positive().nullable().optional(),
  projectUnitId: z.number().int().positive().nullable().optional(),
  paymentMethodId: z.number().int().positive('طريقة الدفع مطلوبة'),
  paymentReference: z.string().trim().min(1).nullable().optional(),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  description: z.string().trim().min(3, 'تفاصيل المصروف مطلوبة'),
  invoiceStatus: z.enum(['PROVIDED', 'NOT_AVAILABLE', 'NOT_REQUIRED', 'PENDING']).optional(),
  invoiceNumber: z.string().trim().min(1).nullable().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  invoiceAmount: z.number().positive().nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
}).superRefine((data, ctx) => {
  if (!data.beneficiaryId && !data.beneficiaryName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يرجى اختيار أو كتابة اسم المستفيد',
      path: ['beneficiaryId'],
    });
  }
});

export const TodayTransactionUpdateSchema = z.object({
  manualVoucherNumber: z.string().trim().min(1).nullable().optional(),
  beneficiaryId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  projectUnitId: z.number().int().positive().nullable().optional(),
  paymentMethodId: z.number().int().positive().optional(),
  paymentReference: z.string().trim().min(1).nullable().optional(),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر').optional(),
  description: z.string().trim().min(3, 'تفاصيل المصروف مطلوبة').optional(),
  invoiceStatus: z.enum(['PROVIDED', 'NOT_AVAILABLE', 'NOT_REQUIRED', 'PENDING']).optional(),
  invoiceNumber: z.string().trim().min(1).nullable().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  invoiceAmount: z.number().positive().nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'يجب إرسال حقل واحد على الأقل للتعديل',
});
