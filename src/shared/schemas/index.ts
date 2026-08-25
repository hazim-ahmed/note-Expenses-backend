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

export const ProjectUnitCreateSchema = z.object({
  unitNumber: z.string().min(1, 'رقم الوحدة إجباري'),
  unitType: z.string().min(1, 'نوع الوحدة إجباري'),
  buildingNumber: z.string().nullable().optional(),
  floorNumber: z.string().nullable().optional(),
  status: z.enum(['AVAILABLE', 'SOLD', 'RENTED', 'UNDER_MAINTENANCE']).default('AVAILABLE'),
});

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
  invoiceNumber: z.string().trim().min(1).nullable().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  invoiceAmount: z.number().positive().nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'يجب إرسال حقل واحد على الأقل للتعديل',
});
