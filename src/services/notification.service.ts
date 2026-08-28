import { logger } from '../utils/logger';
import { config } from '../config';
import { prisma } from '../utils/prisma';

export interface NotificationPayload {
  to?: string;
  recipientUserId?: number | bigint;
  title: string;
  body: string;
  type: 'TRANSACTION_APPROVED' | 'TRANSACTION_REJECTED' | 'JOURNAL_CLOSED' | 'SYSTEM_ALERT';
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatch notification asynchronously (Email + Audit/System Log)
   */
  static async sendNotification(payload: NotificationPayload): Promise<void> {
    // Run in background setImmediate so caller thread is never blocked
    setImmediate(async () => {
      try {
        let recipientEmail = payload.to;

        // If recipientUserId is provided and no email, fetch user email
        if (!recipientEmail && payload.recipientUserId) {
          const user = await prisma.user.findUnique({
            where: { id: BigInt(payload.recipientUserId) },
            select: { email: true, fullName: true, username: true },
          });
          if (user?.email) {
            recipientEmail = user.email;
          }
        }

        logger.info(`🔔 [Notification Engine] Event: ${payload.type} | Title: "${payload.title}" | Recipient: ${recipientEmail || 'System/Admin'}`);

        // If email notifications are enabled via environment config, dispatch email
        if (config.email.enabled && recipientEmail) {
          await this.dispatchEmail({
            to: recipientEmail,
            subject: payload.title,
            body: payload.body,
          });
        }
      } catch (err) {
        logger.error(`❌ [Notification Engine Error] Failed to send notification:`, err);
      }
    });
  }

  /**
   * Helper: Dispatch email via SMTP or Provider
   */
  private static async dispatchEmail(options: { to: string; subject: string; body: string }): Promise<void> {
    try {
      logger.info(`📧 Sending Email to: ${options.to} | Subject: ${options.subject}`);
      // If a real SMTP library like nodemailer is configured, it would send here.
      // E.g.: await transporter.sendMail({ from: config.email.from, to: options.to, subject: options.subject, text: options.body });
    } catch (error) {
      logger.error(`❌ Email Delivery Failed:`, error);
    }
  }

  /**
   * Event Handler: Transaction Approved Notification
   */
  static async notifyTransactionApproved(params: {
    transactionId: number | bigint;
    systemReference: string;
    amount: number | string;
    approvedByUserId: number | bigint;
    createdByUserId: number | bigint;
  }): Promise<void> {
    await this.sendNotification({
      recipientUserId: params.createdByUserId,
      type: 'TRANSACTION_APPROVED',
      title: `تم اعتماد سند الصرف (${params.systemReference})`,
      body: `عزيزي المستخدم، تم اعتماد سند الصرف رقم ${params.systemReference} بمبلغ ${params.amount} ر.س بنجاح.`,
      metadata: { transactionId: String(params.transactionId), approvedBy: String(params.approvedByUserId) },
    });
  }

  /**
   * Event Handler: Transaction Rejected Notification
   */
  static async notifyTransactionRejected(params: {
    transactionId: number | bigint;
    systemReference: string;
    amount: number | string;
    reason: string;
    rejectedByUserId: number | bigint;
    createdByUserId: number | bigint;
  }): Promise<void> {
    await this.sendNotification({
      recipientUserId: params.createdByUserId,
      type: 'TRANSACTION_REJECTED',
      title: `تم رفض سند الصرف (${params.systemReference})`,
      body: `عزيزي المستخدم، تم رفض سند الصرف رقم ${params.systemReference} بمبلغ ${params.amount} ر.س. السبب: ${params.reason}`,
      metadata: { transactionId: String(params.transactionId), reason: params.reason },
    });
  }

  /**
   * Event Handler: Journal Closed Notification
   */
  static async notifyJournalClosed(params: {
    journalId: number | bigint;
    journalNumber: string;
    cashboxName: string;
    closedByUserId: number | bigint;
    preparerUserId: number | bigint;
  }): Promise<void> {
    await this.sendNotification({
      recipientUserId: params.preparerUserId,
      type: 'JOURNAL_CLOSED',
      title: `تم إغلاق دفتر اليومية (${params.journalNumber})`,
      body: `تم إغلاق دفتر اليومية رقم ${params.journalNumber} للصندوق (${params.cashboxName}) بنجاح.`,
      metadata: { journalId: String(params.journalId) },
    });
  }
}
