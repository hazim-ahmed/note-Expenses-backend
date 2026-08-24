"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_SETTINGS_KEYS = exports.SystemRole = exports.ApprovalAction = exports.AttachmentType = exports.ProjectStatus = exports.BeneficiaryType = exports.InvoiceStatus = exports.TransactionType = exports.TransactionStatus = exports.JournalStatus = exports.VoucherSource = exports.ProjectRequirementMode = void 0;
var ProjectRequirementMode;
(function (ProjectRequirementMode) {
    ProjectRequirementMode["OPTIONAL"] = "OPTIONAL";
    ProjectRequirementMode["REQUIRED_ON_APPROVAL"] = "REQUIRED_ON_APPROVAL";
    ProjectRequirementMode["REQUIRED_ON_CREATE"] = "REQUIRED_ON_CREATE";
})(ProjectRequirementMode || (exports.ProjectRequirementMode = ProjectRequirementMode = {}));
var VoucherSource;
(function (VoucherSource) {
    VoucherSource["MANUAL"] = "MANUAL";
    VoucherSource["SYSTEM"] = "SYSTEM";
})(VoucherSource || (exports.VoucherSource = VoucherSource = {}));
var JournalStatus;
(function (JournalStatus) {
    JournalStatus["OPEN"] = "OPEN";
    JournalStatus["SUBMITTED"] = "SUBMITTED";
    JournalStatus["APPROVED"] = "APPROVED";
    JournalStatus["REJECTED"] = "REJECTED";
    JournalStatus["CLOSED"] = "CLOSED";
    JournalStatus["CANCELLED"] = "CANCELLED";
})(JournalStatus || (exports.JournalStatus = JournalStatus = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["DRAFT"] = "DRAFT";
    TransactionStatus["SUBMITTED"] = "SUBMITTED";
    TransactionStatus["APPROVED"] = "APPROVED";
    TransactionStatus["REJECTED"] = "REJECTED";
    TransactionStatus["POSTED"] = "POSTED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["PURCHASE"] = "PURCHASE";
    TransactionType["GENERAL_EXPENSE"] = "GENERAL_EXPENSE";
    TransactionType["COMMISSION"] = "COMMISSION";
    TransactionType["SERVICE"] = "SERVICE";
    TransactionType["SALARY"] = "SALARY";
    TransactionType["ADVANCE"] = "ADVANCE";
    TransactionType["GOVERNMENT_FEE"] = "GOVERNMENT_FEE";
    TransactionType["REFUND"] = "REFUND";
    TransactionType["OTHER"] = "OTHER";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["PROVIDED"] = "PROVIDED";
    InvoiceStatus["NOT_AVAILABLE"] = "NOT_AVAILABLE";
    InvoiceStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
    InvoiceStatus["PENDING"] = "PENDING";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var BeneficiaryType;
(function (BeneficiaryType) {
    BeneficiaryType["PERSON"] = "PERSON";
    BeneficiaryType["EMPLOYEE"] = "EMPLOYEE";
    BeneficiaryType["SUPPLIER"] = "SUPPLIER";
    BeneficiaryType["COMPANY"] = "COMPANY";
    BeneficiaryType["INSTITUTION"] = "INSTITUTION";
    BeneficiaryType["OTHER"] = "OTHER";
})(BeneficiaryType || (exports.BeneficiaryType = BeneficiaryType = {}));
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["PLANNED"] = "PLANNED";
    ProjectStatus["ACTIVE"] = "ACTIVE";
    ProjectStatus["SUSPENDED"] = "SUSPENDED";
    ProjectStatus["COMPLETED"] = "COMPLETED";
    ProjectStatus["CANCELLED"] = "CANCELLED";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var AttachmentType;
(function (AttachmentType) {
    AttachmentType["INVOICE"] = "INVOICE";
    AttachmentType["RECEIPT"] = "RECEIPT";
    AttachmentType["BANK_TRANSFER"] = "BANK_TRANSFER";
    AttachmentType["CONTRACT"] = "CONTRACT";
    AttachmentType["MANUAL_VOUCHER"] = "MANUAL_VOUCHER";
    AttachmentType["OTHER"] = "OTHER";
})(AttachmentType || (exports.AttachmentType = AttachmentType = {}));
var ApprovalAction;
(function (ApprovalAction) {
    ApprovalAction["SUBMITTED"] = "SUBMITTED";
    ApprovalAction["APPROVED"] = "APPROVED";
    ApprovalAction["REJECTED"] = "REJECTED";
    ApprovalAction["RETURNED"] = "RETURNED";
    ApprovalAction["CANCELLED"] = "CANCELLED";
    ApprovalAction["POSTED"] = "POSTED";
})(ApprovalAction || (exports.ApprovalAction = ApprovalAction = {}));
var SystemRole;
(function (SystemRole) {
    SystemRole["ADMIN"] = "ADMIN";
    SystemRole["CASHIER"] = "CASHIER";
    SystemRole["ACCOUNTANT"] = "ACCOUNTANT";
    SystemRole["MANAGER"] = "MANAGER";
    SystemRole["VIEWER"] = "VIEWER";
})(SystemRole || (exports.SystemRole = SystemRole = {}));
exports.SYSTEM_SETTINGS_KEYS = {
    PROJECT_REQUIREMENT_MODE: 'expenses.project_requirement_mode',
    PREVENT_SELF_APPROVAL: 'expenses.prevent_self_approval',
    MAX_MANAGER_APPROVAL_LIMIT: 'expenses.max_manager_approval_limit',
};
