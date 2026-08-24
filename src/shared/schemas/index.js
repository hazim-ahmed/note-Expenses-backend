"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseTransactionCreateSchema = exports.BulkAssignProjectSchema = exports.AssignProjectSchema = exports.SystemSettingUpdateSchema = exports.RefreshTokenSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
exports.LoginSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
    password: zod_1.z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});
exports.RefreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'رمز التحديث مطلوب'),
});
exports.SystemSettingUpdateSchema = zod_1.z.object({
    value: zod_1.z.nativeEnum(constants_1.ProjectRequirementMode, {
        errorMap: () => ({ message: 'القيمة المدخلة لإلزامية المشروع غير صالحة' }),
    }),
});
exports.AssignProjectSchema = zod_1.z.object({
    projectId: zod_1.z.number().int().positive('رقم المشروع غير صالح'),
    projectUnitId: zod_1.z.number().int().positive().nullable().optional(),
    reason: zod_1.z.string().min(3, 'سبب الربط مطلوب'),
});
exports.BulkAssignProjectSchema = zod_1.z.object({
    transactionIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, 'اختر عملية واحدة على الأقل'),
    projectId: zod_1.z.number().int().positive('رقم المشروع غير صالح'),
    projectUnitId: zod_1.z.number().int().positive().nullable().optional(),
    reason: zod_1.z.string().min(3, 'سبب الربط مطلوب'),
});
exports.ExpenseTransactionCreateSchema = zod_1.z.object({
    journalId: zod_1.z.number().int().positive('رقم اليومية مطلوب'),
    voucherSource: zod_1.z.nativeEnum(constants_1.VoucherSource).default(constants_1.VoucherSource.MANUAL),
    manualVoucherNumber: zod_1.z.string().nullable().optional(),
    voucherBookNumber: zod_1.z.string().nullable().optional(),
    voucherDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'),
    transactionType: zod_1.z.nativeEnum(constants_1.TransactionType),
    beneficiaryId: zod_1.z.number().int().positive('المستفيد مطلوب'),
    categoryId: zod_1.z.number().int().positive('التصنيف مطلوب'),
    projectId: zod_1.z.number().int().positive().nullable().optional(),
    projectUnitId: zod_1.z.number().int().positive().nullable().optional(),
    paymentMethodId: zod_1.z.number().int().positive('طريقة الدفع مطلوبة'),
    amount: zod_1.z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
    description: zod_1.z.string().min(3, 'الوصف مطلوب'),
    invoiceStatus: zod_1.z.nativeEnum(constants_1.InvoiceStatus).default(constants_1.InvoiceStatus.NOT_REQUIRED),
    invoiceNumber: zod_1.z.string().nullable().optional(),
    invoiceDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    invoiceAmount: zod_1.z.number().positive().nullable().optional(),
    paymentReference: zod_1.z.string().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
}).superRefine((data, ctx) => {
    if (data.voucherSource === constants_1.VoucherSource.MANUAL && (!data.manualVoucherNumber || data.manualVoucherNumber.trim() === '')) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'رقم السند اليدوي مطلوب عندما يكون مصدر السند يدوياً',
            path: ['manualVoucherNumber'],
        });
    }
    if (data.transactionType === constants_1.TransactionType.PURCHASE && data.invoiceStatus === constants_1.InvoiceStatus.PROVIDED) {
        if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'رقم الفاتورة مطلوب عند توفر الفاتورة في عمليات الشراء',
                path: ['invoiceNumber'],
            });
        }
    }
});
