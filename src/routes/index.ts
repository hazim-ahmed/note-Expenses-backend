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
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// ─────────────────────────────────────────
// 1. Auth Routes (Public)
// ─────────────────────────────────────────
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh', AuthController.refresh);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', authenticateJWT, AuthController.me);

// ─────────────────────────────────────────
// 2. Today's Auto Journal Engine
// ─────────────────────────────────────────
router.get('/today', authenticateJWT, TodayController.getTodayOverview);
router.get('/today/transactions', authenticateJWT, TodayController.getTodayTransactions);
router.post('/today/transactions', authenticateJWT, TodayController.createTransaction);
router.patch('/today/transactions/:id', authenticateJWT, TodayController.updateTransaction);
router.delete('/today/transactions/:id', authenticateJWT, TodayController.deleteTransaction);

// ─────────────────────────────────────────
// 3. Journals (Daily Expense Books)
// ─────────────────────────────────────────
router.get('/journals', authenticateJWT, JournalController.getAll);
router.get('/journals/:id', authenticateJWT, JournalController.getById);
router.get('/journals/:id/export/excel', authenticateJWT, JournalController.exportExcel);
router.get('/journals/:id/export/pdf', authenticateJWT, JournalController.exportPDF);
router.post('/journals/:id/close', authenticateJWT, JournalController.close);
router.post('/journals/:id/reopen', authenticateJWT, JournalController.reopen);

// ─────────────────────────────────────────
// 4. Expense Transactions (Bulk Operations)
// ─────────────────────────────────────────
router.patch('/expense-transactions/bulk-assign-project', authenticateJWT, TransactionController.bulkAssignProject);

// ─────────────────────────────────────────
// 5. Projects & Units
// ─────────────────────────────────────────
router.get('/projects', authenticateJWT, ProjectController.getAll);
router.post('/projects', authenticateJWT, ProjectController.create);
router.get('/projects/:id', authenticateJWT, ProjectController.getById);
router.patch('/projects/:id', authenticateJWT, ProjectController.update);
router.patch('/projects/:id/status', authenticateJWT, ProjectController.updateStatus);
router.post('/projects/:id/archive', authenticateJWT, ProjectController.archive);
router.get('/projects/:id/summary', authenticateJWT, ProjectController.getSummary);
router.get('/projects/:id/transactions', authenticateJWT, ProjectController.getTransactions);
// Project Units
router.get('/projects/:projectId/units', authenticateJWT, ProjectController.getUnits);
router.post('/projects/:projectId/units', authenticateJWT, ProjectController.createUnit);
router.patch('/projects/:projectId/units/:id', authenticateJWT, ProjectController.updateUnit);
router.delete('/projects/:projectId/units/:id', authenticateJWT, ProjectController.deleteUnit);

// ─────────────────────────────────────────
// 6. Users & RBAC
// ─────────────────────────────────────────
router.get('/users', authenticateJWT, UserController.getAll);
router.post('/users', authenticateJWT, UserController.create);
router.get('/users/:id', authenticateJWT, UserController.getById);
router.patch('/users/:id', authenticateJWT, UserController.update);
router.patch('/users/:id/status', authenticateJWT, UserController.toggleStatus);
router.post('/users/:id/reset-password', authenticateJWT, UserController.resetPassword);
router.patch('/users/:id/roles', authenticateJWT, UserController.updateRoles);
router.patch('/users/:id/projects', authenticateJWT, UserController.updateProjects);
router.patch('/users/:id/cashboxes', authenticateJWT, UserController.updateCashboxes);

// ─────────────────────────────────────────
// 7. Beneficiaries
// ─────────────────────────────────────────
router.get('/beneficiaries', authenticateJWT, BeneficiaryController.getAll);
router.post('/beneficiaries', authenticateJWT, BeneficiaryController.create);
router.get('/beneficiaries/:id', authenticateJWT, BeneficiaryController.getById);
router.patch('/beneficiaries/:id', authenticateJWT, BeneficiaryController.update);

// ─────────────────────────────────────────
// 8. Expense Categories
// ─────────────────────────────────────────
router.get('/expense-categories', authenticateJWT, CategoryController.getAll);
router.post('/expense-categories', authenticateJWT, CategoryController.create);

// ─────────────────────────────────────────
// 9. Cashboxes
// ─────────────────────────────────────────
router.get('/cashboxes', authenticateJWT, CashboxController.getAll);
router.post('/cashboxes', authenticateJWT, CashboxController.create);
router.patch('/cashboxes/:id', authenticateJWT, CashboxController.update);

// ─────────────────────────────────────────
// 10. Payment Methods
// ─────────────────────────────────────────
router.get('/payment-methods', authenticateJWT, PaymentMethodController.getAll);

// ─────────────────────────────────────────
// 11. System Settings
// ─────────────────────────────────────────
router.get('/system-settings', authenticateJWT, SystemSettingController.getAll);
router.patch('/system-settings/expenses.project_requirement_mode', authenticateJWT, SystemSettingController.updateProjectRequirementMode);

// ─────────────────────────────────────────
// 12. Reports (7 Reports)
// ─────────────────────────────────────────
router.get('/reports/daily-expenses', authenticateJWT, ReportController.getDailyExpenses);
router.get('/reports/daily-expenses/export/excel', authenticateJWT, ReportController.exportDailyExpensesExcel);
router.get('/reports/daily-expenses/export/pdf', authenticateJWT, ReportController.exportDailyExpensesPDF);

router.get('/reports/by-project', authenticateJWT, ReportController.getExpensesByProject);
router.get('/reports/by-project/export/excel', authenticateJWT, ReportController.exportExpensesByProjectExcel);
router.get('/reports/by-project/export/pdf', authenticateJWT, ReportController.exportExpensesByProjectPDF);

router.get('/reports/by-beneficiary', authenticateJWT, ReportController.getExpensesByBeneficiary);
router.get('/reports/by-category', authenticateJWT, ReportController.getExpensesByCategory);

router.get('/reports/unassigned-project-transactions', authenticateJWT, ReportController.getUnassignedProjectTransactions);
router.get('/reports/unassigned-project-transactions/export/excel', authenticateJWT, ReportController.exportUnassignedTransactionsExcel);
router.get('/reports/unassigned-project-transactions/export/pdf', authenticateJWT, ReportController.exportUnassignedTransactionsPDF);

router.get('/reports/pending-invoices', authenticateJWT, ReportController.getPendingInvoices);
router.get('/reports/pending-invoices/export/excel', authenticateJWT, ReportController.exportPendingInvoicesExcel);
router.get('/reports/pending-invoices/export/pdf', authenticateJWT, ReportController.exportPendingInvoicesPDF);

router.get('/reports/manual-vouchers', authenticateJWT, ReportController.getManualVouchers);
router.get('/reports/manual-vouchers/export/excel', authenticateJWT, ReportController.exportManualVouchersExcel);
router.get('/reports/manual-vouchers/export/pdf', authenticateJWT, ReportController.exportManualVouchersPDF);

// ─────────────────────────────────────────
// 13. Audit Logs
// ─────────────────────────────────────────
router.get('/audit-logs', authenticateJWT, AuditLogController.getAll);

export default router;

