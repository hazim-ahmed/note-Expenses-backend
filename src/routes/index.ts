import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { TodayController } from '../controllers/today.controller';
import { UserController } from '../controllers/user.controller';
import { ProjectController } from '../controllers/project.controller';
import { JournalController } from '../controllers/journal.controller';
import { TransactionController } from '../controllers/transaction.controller';
import { BeneficiaryController } from '../controllers/beneficiary.controller';
import { CategoryController } from '../controllers/category.controller';
import { SystemSettingController } from '../controllers/systemSetting.controller';
import { CashboxController } from '../controllers/cashbox.controller';
import { PaymentMethodController } from '../controllers/paymentMethod.controller';
import { ReportController } from '../controllers/report.controller';
import { AuditLogController } from '../controllers/auditLog.controller';
import { AttachmentController } from '../controllers/attachment.controller';
import { BackupController } from '../controllers/backup.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { authenticateJWT, requirePermission, requireRole } from '../middleware/auth.middleware';

import { SystemStatusController } from '../controllers/systemStatus.controller';

const router = Router();

// Public System Status Ping Endpoint (Ultra-Fast Keep-Alive)
router.get('/system-status', SystemStatusController.getStatus);

// ─────────────────────────────────────────
// 1. Auth Routes (Public & Semi-Public)
// ─────────────────────────────────────────
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh', AuthController.refresh);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', authenticateJWT, AuthController.me);

// ─────────────────────────────────────────
// 2. Today's Auto Journal Engine
// ─────────────────────────────────────────
router.get('/today', authenticateJWT, requirePermission('transactions:read'), TodayController.getTodayOverview);
router.get('/today/transactions', authenticateJWT, requirePermission('transactions:read'), TodayController.getTodayTransactions);
router.post('/today/transactions', authenticateJWT, requirePermission('transactions:create'), TodayController.createTransaction);
router.patch('/today/transactions/:id', authenticateJWT, requirePermission('transactions:update'), TodayController.updateTransaction);
router.delete('/today/transactions/:id', authenticateJWT, requirePermission('transactions:cancel'), TodayController.deleteTransaction);

// ─────────────────────────────────────────
// 3. Journals (Daily Expense Books)
// ─────────────────────────────────────────
router.get('/journals', authenticateJWT, requirePermission('transactions:read'), JournalController.getAll);
router.get('/journals/:id', authenticateJWT, requirePermission('transactions:read'), JournalController.getById);
router.get('/journals/:id/export/excel', authenticateJWT, requirePermission('reports:view'), JournalController.exportExcel);
router.get('/journals/:id/export/pdf', authenticateJWT, requirePermission('reports:view'), JournalController.exportPDF);
router.post('/journals/:id/close', authenticateJWT, requirePermission('journals:close'), JournalController.close);
router.post('/journals/:id/approve', authenticateJWT, requirePermission('journals:approve'), JournalController.approve);
router.post('/journals/:id/reopen', authenticateJWT, requirePermission('journals:reopen'), JournalController.reopen);

// ─────────────────────────────────────────
// 4. Expense Transactions & Approvals
// ─────────────────────────────────────────
router.post('/expense-transactions', authenticateJWT, requirePermission('transactions:create'), TransactionController.create);
router.patch('/expense-transactions/bulk-assign-project', authenticateJWT, requirePermission('transactions:assign_project'), TransactionController.bulkAssignProject);
router.patch('/expense-transactions/:id', authenticateJWT, requirePermission('transactions:update'), TransactionController.update);
router.delete('/expense-transactions/:id', authenticateJWT, requirePermission('transactions:cancel'), TransactionController.delete);
router.post('/expense-transactions/:id/approve', authenticateJWT, requirePermission('transactions:approve'), TransactionController.approve);
router.post('/expense-transactions/:id/reject', authenticateJWT, requirePermission('transactions:reject'), TransactionController.reject);

// Attachments
router.post('/expense-transactions/:id/attachments', authenticateJWT, requirePermission('transactions:update'), uploadMiddleware.single('file'), AttachmentController.upload);
router.get('/expense-transactions/:id/attachments', authenticateJWT, requirePermission('transactions:read'), AttachmentController.getByTransaction);
router.get('/expense-transactions/attachments/:attachmentId/download', authenticateJWT, requirePermission('transactions:read'), AttachmentController.download);
router.delete('/expense-transactions/attachments/:attachmentId', authenticateJWT, requirePermission('transactions:update'), AttachmentController.delete);

// ─────────────────────────────────────────
// 5. Projects & Units
// ─────────────────────────────────────────
router.get('/projects', authenticateJWT, requirePermission('projects.view'), ProjectController.getAll);
router.post('/projects', authenticateJWT, requirePermission('projects.create'), ProjectController.create);
router.get('/projects/:id', authenticateJWT, requirePermission('projects.view'), ProjectController.getById);
router.patch('/projects/:id', authenticateJWT, requirePermission('projects.update'), ProjectController.update);
router.patch('/projects/:id/status', authenticateJWT, requirePermission('projects.update'), ProjectController.updateStatus);
router.post('/projects/:id/archive', authenticateJWT, requirePermission('projects.archive'), ProjectController.archive);
router.get('/projects/:id/summary', authenticateJWT, requirePermission('projects.view_expenses'), ProjectController.getSummary);
router.get('/projects/:id/transactions', authenticateJWT, requirePermission('projects.view_expenses'), ProjectController.getTransactions);

// Project Units
router.get('/projects/:projectId/units', authenticateJWT, requirePermission('projects.view'), ProjectController.getUnits);
router.post('/projects/:projectId/units', authenticateJWT, requirePermission('projects.create'), ProjectController.createUnit);
router.patch('/projects/:projectId/units/:id', authenticateJWT, requirePermission('projects.update'), ProjectController.updateUnit);
router.delete('/projects/:projectId/units/:id', authenticateJWT, requirePermission('projects.update'), ProjectController.deleteUnit);

// ─────────────────────────────────────────
// 6. Users & RBAC
// ─────────────────────────────────────────
router.get('/users', authenticateJWT, requirePermission('users.view'), UserController.getAll);
router.post('/users', authenticateJWT, requirePermission('users.create'), UserController.create);
router.get('/users/:id', authenticateJWT, requirePermission('users.view'), UserController.getById);
router.patch('/users/:id', authenticateJWT, requirePermission('users.update'), UserController.update);
router.patch('/users/:id/status', authenticateJWT, requirePermission('users.activate'), UserController.toggleStatus);
router.post('/users/:id/reset-password', authenticateJWT, requirePermission('users.reset_password'), UserController.resetPassword);
router.patch('/users/:id/roles', authenticateJWT, requirePermission('users.assign_roles'), UserController.updateRoles);
router.patch('/users/:id/projects', authenticateJWT, requirePermission('users.assign_roles'), UserController.updateProjects);
router.patch('/users/:id/cashboxes', authenticateJWT, requirePermission('users.assign_roles'), UserController.updateCashboxes);
router.get('/roles', authenticateJWT, UserController.getRoles);

// ─────────────────────────────────────────
// 7. Beneficiaries
// ─────────────────────────────────────────
router.get('/beneficiaries', authenticateJWT, requirePermission('transactions:read'), BeneficiaryController.getAll);
router.post('/beneficiaries', authenticateJWT, requirePermission('transactions:create'), BeneficiaryController.create);
router.get('/beneficiaries/:id', authenticateJWT, requirePermission('transactions:read'), BeneficiaryController.getById);
router.patch('/beneficiaries/:id', authenticateJWT, requirePermission('transactions:update'), BeneficiaryController.update);

// ─────────────────────────────────────────
// 8. Expense Categories
// ─────────────────────────────────────────
router.get('/expense-categories', authenticateJWT, requirePermission('transactions:read'), CategoryController.getAll);
router.post('/expense-categories', authenticateJWT, requirePermission('transactions:create'), CategoryController.create);
router.patch('/expense-categories/:id', authenticateJWT, requirePermission('transactions:update'), CategoryController.update);

// ─────────────────────────────────────────
// 9. Cashboxes
// ─────────────────────────────────────────
router.get('/cashboxes', authenticateJWT, requirePermission('transactions:read'), CashboxController.getAll);
router.post('/cashboxes', authenticateJWT, requirePermission('system_settings:update'), CashboxController.create);
router.patch('/cashboxes/:id', authenticateJWT, requirePermission('system_settings:update'), CashboxController.update);

// ─────────────────────────────────────────
// 10. Payment Methods
// ─────────────────────────────────────────
router.get('/payment-methods', authenticateJWT, requirePermission('transactions:read'), PaymentMethodController.getAll);

// ─────────────────────────────────────────
// 11. System Settings
// ─────────────────────────────────────────
router.get('/system-settings', authenticateJWT, requirePermission('system_settings:read'), SystemSettingController.getAll);
router.patch('/system-settings/expenses.project_requirement_mode', authenticateJWT, requirePermission('system_settings:update'), SystemSettingController.updateProjectRequirementMode);

// ─────────────────────────────────────────
// 12. Reports (7 Reports)
// ─────────────────────────────────────────
router.get('/reports/daily-expenses', authenticateJWT, requirePermission('reports:view'), ReportController.getDailyExpenses);
router.get('/reports/daily-expenses/export/excel', authenticateJWT, requirePermission('reports:view'), ReportController.exportDailyExpensesExcel);
router.get('/reports/daily-expenses/export/pdf', authenticateJWT, requirePermission('reports:view'), ReportController.exportDailyExpensesPDF);

router.get('/reports/by-project', authenticateJWT, requirePermission('reports:view'), ReportController.getExpensesByProject);
router.get('/reports/by-project/export/excel', authenticateJWT, requirePermission('reports:view'), ReportController.exportExpensesByProjectExcel);
router.get('/reports/by-project/export/pdf', authenticateJWT, requirePermission('reports:view'), ReportController.exportExpensesByProjectPDF);

router.get('/reports/by-beneficiary', authenticateJWT, requirePermission('reports:view'), ReportController.getExpensesByBeneficiary);
router.get('/reports/by-category', authenticateJWT, requirePermission('reports:view'), ReportController.getExpensesByCategory);

router.get('/reports/unassigned-project-transactions', authenticateJWT, requirePermission('reports:view'), ReportController.getUnassignedProjectTransactions);
router.get('/reports/unassigned-project-transactions/export/excel', authenticateJWT, requirePermission('reports:view'), ReportController.exportUnassignedTransactionsExcel);
router.get('/reports/unassigned-project-transactions/export/pdf', authenticateJWT, requirePermission('reports:view'), ReportController.exportUnassignedTransactionsPDF);

router.get('/reports/pending-invoices', authenticateJWT, requirePermission('reports:view'), ReportController.getPendingInvoices);
router.get('/reports/pending-invoices/export/excel', authenticateJWT, requirePermission('reports:view'), ReportController.exportPendingInvoicesExcel);
router.get('/reports/pending-invoices/export/pdf', authenticateJWT, requirePermission('reports:view'), ReportController.exportPendingInvoicesPDF);

router.get('/reports/manual-vouchers', authenticateJWT, requirePermission('reports:view'), ReportController.getManualVouchers);
router.get('/reports/manual-vouchers/export/excel', authenticateJWT, requirePermission('reports:view'), ReportController.exportManualVouchersExcel);
router.get('/reports/manual-vouchers/export/pdf', authenticateJWT, requirePermission('reports:view'), ReportController.exportManualVouchersPDF);

// ─────────────────────────────────────────
// 13. Audit Logs
// ─────────────────────────────────────────
router.get('/audit-logs', authenticateJWT, requirePermission('users.view_activity'), AuditLogController.getAll);

// ─────────────────────────────────────────
// 14. System Database Backups (Admin Only)
// ─────────────────────────────────────────
router.post('/system/backups', authenticateJWT, requireRole('ADMIN'), BackupController.createBackup);
router.get('/system/backups', authenticateJWT, requireRole('ADMIN'), BackupController.listBackups);

export default router;

