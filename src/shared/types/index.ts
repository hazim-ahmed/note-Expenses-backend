import {
  ProjectRequirementMode,
  VoucherSource,
  JournalStatus,
  TransactionStatus,
  TransactionType,
  InvoiceStatus,
  BeneficiaryType,
  ProjectStatus,
  AttachmentType,
  ApprovalAction,
  SystemRole,
} from '../constants';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  errors?: any[];
}

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email?: string | null;
  roles: string[];
  permissions: string[];
}

export interface SystemSettingItem {
  id: number;
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
}

export interface BulkAssignProjectPayload {
  transactionIds: number[];
  projectId: number;
  projectUnitId?: number | null;
  reason: string;
}

export interface AssignProjectPayload {
  projectId: number;
  projectUnitId?: number | null;
  reason: string;
}
