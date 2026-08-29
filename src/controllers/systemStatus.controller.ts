import { Request, Response } from 'express';

export class SystemStatusController {
  static getStatus(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      service: 'Real Estate & Expense Management System',
      status: 'ACTIVE',
      message: 'Server is active, healthy, and ready.',
      timestamp: new Date().toISOString(),
    });
  }
}
