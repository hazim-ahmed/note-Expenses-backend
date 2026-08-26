import { Response, NextFunction } from 'express';
import fs from 'fs';
import { AttachmentService } from '../services/attachment.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AttachmentController {
  static async upload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const userId = req.user!.id;
      const attachmentType = req.body.attachmentType || 'INVOICE';
      const file = req.file as Express.Multer.File;

      const result = await AttachmentService.uploadAttachment(transactionId, file, userId, attachmentType);
      return sendSuccess(res, result, 'تم رفع المرفق بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getByTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const items = await AttachmentService.getAttachmentsByTransaction(transactionId);
      return sendSuccess(res, items, 'تم جلب مرفقات السند بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async download(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const attachmentId = parseInt(req.params.attachmentId, 10);
      const attachment = await AttachmentService.getAttachmentById(attachmentId);

      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(attachment.originalFileName)}"`
      );
      res.setHeader('Content-Length', attachment.fileSize);

      const fileStream = fs.createReadStream(attachment.filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const attachmentId = parseInt(req.params.attachmentId, 10);
      const userId = req.user!.id;
      const userRole = req.user!.roles[0] || 'USER';

      const result = await AttachmentService.deleteAttachment(attachmentId, userId, userRole);
      return sendSuccess(res, result, 'تم حذف المرفق بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
