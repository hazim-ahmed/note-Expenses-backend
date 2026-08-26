import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

export class AttachmentService {
  static async uploadAttachment(
    transactionId: number,
    file: Express.Multer.File,
    userId: number,
    attachmentType: string = 'INVOICE'
  ) {
    if (!file) {
      throw new AppError('يرجى اختيار ملف المرفق للرفع', 400, 'FILE_REQUIRED');
    }

    const tx = await prisma.expenseTransaction.findUnique({
      where: { id: BigInt(transactionId) },
      include: { journal: true },
    });

    if (!tx || tx.deletedAt) {
      throw new AppError('سند الصرف المحدد غير موجود', 404, 'TRANSACTION_NOT_FOUND');
    }

    const attachment = await prisma.$transaction(async (db) => {
      const created = await db.transactionAttachment.create({
        data: {
          transactionId: BigInt(transactionId),
          attachmentType,
          originalFileName: file.originalname,
          storedFileName: file.filename,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: BigInt(userId),
        },
      });

      await db.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'TRANSACTION_ATTACHMENT',
          entityId: created.id,
          action: 'UPLOAD_ATTACHMENT',
          newValues: {
            transactionId,
            originalFileName: file.originalname,
            fileSize: file.size,
          },
          reason: `رفع مرفق (${file.originalname}) لسند الصرف رقم ${tx.systemReference}`,
        },
      });

      return created;
    });

    return {
      id: Number(attachment.id),
      transactionId: Number(attachment.transactionId),
      attachmentType: attachment.attachmentType,
      originalFileName: attachment.originalFileName,
      storedFileName: attachment.storedFileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      createdAt: attachment.createdAt,
    };
  }

  static async getAttachmentsByTransaction(transactionId: number) {
    const items = await prisma.transactionAttachment.findMany({
      where: { transactionId: BigInt(transactionId) },
      include: {
        uploader: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { id: 'desc' },
    });

    return items.map((a) => ({
      id: Number(a.id),
      transactionId: Number(a.transactionId),
      attachmentType: a.attachmentType,
      originalFileName: a.originalFileName,
      storedFileName: a.storedFileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      createdAt: a.createdAt,
      uploader: a.uploader ? { ...a.uploader, id: Number(a.uploader.id) } : null,
    }));
  }

  static async deleteAttachment(attachmentId: number, userId: number, userRole: string) {
    const attachment = await prisma.transactionAttachment.findUnique({
      where: { id: BigInt(attachmentId) },
      include: { transaction: { include: { journal: true } } },
    });

    if (!attachment) {
      throw new AppError('المرفق غير موجود', 404, 'ATTACHMENT_NOT_FOUND');
    }

    if (attachment.transaction.journal.status === 'CLOSED' && userRole !== 'ADMIN') {
      throw new AppError('لا يمكن حذف المرفق لأن اليومية التابعة مغلقة', 403, 'JOURNAL_CLOSED');
    }

    await prisma.$transaction(async (db) => {
      await db.transactionAttachment.delete({
        where: { id: BigInt(attachmentId) },
      });

      await db.auditLog.create({
        data: {
          userId: BigInt(userId),
          entityType: 'TRANSACTION_ATTACHMENT',
          entityId: BigInt(attachmentId),
          action: 'DELETE_ATTACHMENT',
          reason: `حذف المرفق ${attachment.originalFileName} من سند الصرف ${attachment.transaction.systemReference}`,
        },
      });
    });

    // Clean up file on disk if exists
    try {
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }
    } catch {
      // Non-blocking disk cleanup error
    }

    return { success: true };
  }

  static async getAttachmentById(attachmentId: number) {
    const attachment = await prisma.transactionAttachment.findUnique({
      where: { id: BigInt(attachmentId) },
    });
    if (!attachment) {
      throw new AppError('المرفق غير موجود', 404, 'ATTACHMENT_NOT_FOUND');
    }
    if (!fs.existsSync(attachment.filePath)) {
      throw new AppError('ملف المرفق غير موجود على الخادم', 404, 'FILE_NOT_FOUND');
    }
    return attachment;
  }
}
