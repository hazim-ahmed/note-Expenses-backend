import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { Response } from 'express';
import { LOGO_BASE64 } from './logo.constant';

export interface ExpenseExportRow {
  index?: number;
  systemReference?: string;
  paymentMethod: string;
  paymentReference?: string;
  voucherNo: string;
  voucherBookNumber?: string;
  date: string;
  beneficiary: string;
  category?: string;
  project?: string;
  invoiceNumber?: string;
  invoiceStatus?: string;
  details: string;
  notes?: string;
  amount: number;
}

export interface ExportReportOptions {
  title: string;
  reportDate?: string;
  journalNumber?: string;
  cashboxName?: string;
  rows: ExpenseExportRow[];
  totalAmount?: number;
}

export interface GenericColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
}

export interface GenericExportOptions {
  title: string;
  subtitle?: string;
  reportDate?: string;
  columns: GenericColumn[];
  rows: Record<string, any>[];
  totalRow?: {
    label: string;
    spanCount: number;
    values: Record<string, any>;
  };
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class ExportService {
  /**
   * توليد ملف إكسل بتنسيق RTL وإرساله مباشرة للمستخدم عبر الـ Stream
   */
  static async generateExcel(options: ExportReportOptions, res: Response, filenamePrefix = 'expenses') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام إدارة المصروفات';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('المصروفات', {
      views: [{ rightToLeft: true }], // تفعيل الاتجاه من اليمين لليسار
    });

    // تعريف الأعمدة
    worksheet.columns = [
      { header: 'م', key: 'index', width: 8 },
      { header: 'الرقم المرجعي', key: 'systemReference', width: 20 },
      { header: 'رقم السند', key: 'voucherNo', width: 18 },
      { header: 'دفتر السند', key: 'voucherBookNumber', width: 16 },
      { header: 'التاريخ', key: 'date', width: 14 },
      { header: 'المستفيد', key: 'beneficiary', width: 28 },
      { header: 'التصنيف', key: 'category', width: 22 },
      { header: 'المشروع', key: 'project', width: 28 },
      { header: 'نوع الدفع', key: 'paymentMethod', width: 16 },
      { header: 'مرجع الدفع', key: 'paymentReference', width: 20 },
      { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 18 },
      { header: 'حالة الفاتورة', key: 'invoiceStatus', width: 18 },
      { header: 'التفاصيل', key: 'details', width: 38 },
      { header: 'ملاحظات', key: 'notes', width: 32 },
      { header: 'المبلغ (ر.س)', key: 'amount', width: 18 },
    ];

    // تنسيق الترويسة الأساسية للأعمدة
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }, // أزرق كحلي أنيق
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    let totalSum = 0;

    // كتابة بيانات الصفوف
    options.rows.forEach((item, idx) => {
      const amt = Number(item.amount) || 0;
      totalSum += amt;

      const row = worksheet.addRow({
        index: idx + 1,
        systemReference: item.systemReference || '-',
        voucherNo: item.voucherNo || '-',
        voucherBookNumber: item.voucherBookNumber || '-',
        date: item.date || '-',
        beneficiary: item.beneficiary || '-',
        category: item.category || '-',
        project: item.project || '-',
        paymentMethod: item.paymentMethod || '-',
        paymentReference: item.paymentReference || '-',
        invoiceNumber: item.invoiceNumber || '-',
        invoiceStatus: item.invoiceStatus || '-',
        details: item.details || '-',
        notes: item.notes || '-',
        amount: amt,
      });

      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: [6, 7, 8, 13, 14].includes(colNumber) ? 'right' : 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        if (colNumber === 15) {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // إضافة صف الإجمالي
    const totalRowIndex = options.rows.length + 2;
    const totalRow = worksheet.addRow({
      index: '',
      systemReference: '',
      voucherNo: '',
      voucherBookNumber: '',
      date: '',
      beneficiary: '',
      category: '',
      project: '',
      paymentMethod: '',
      paymentReference: '',
      invoiceNumber: '',
      invoiceStatus: '',
      details: 'إجمالي المصروفات',
      notes: '',
      amount: options.totalAmount !== undefined ? options.totalAmount : totalSum,
    });

    totalRow.height = 26;
    worksheet.mergeCells(`A${totalRowIndex}:N${totalRowIndex}`);

    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF1F4E78' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'double' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (colNumber <= 14) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = '#,##0.00';
      }
    });

    // إعداد الهيدرز للإرسال المباشر
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `${filenamePrefix}_${dateStamp}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * توليد ملف PDF باستخدام Puppeteer مع قالب HTML عربي يدعم الطباعة والتوقيعات
   */
  static async generatePDF(options: ExportReportOptions, res: Response, filenamePrefix = 'expenses') {
    let browser = null;
    try {
      const reportDate = options.reportDate || new Date().toLocaleDateString('ar-SA');
      const totalAmount =
        options.totalAmount !== undefined
          ? options.totalAmount
          : options.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      const tableRowsHtml = options.rows.length === 0
        ? `<tr><td colspan="11" style="text-align: center; padding: 30px; font-size: 11pt; color: #475569; font-weight: bold;">لا توجد مصروفات خلال الفترة المحددة</td></tr>`
        : options.rows
            .map(
              (item, idx) => `
            <tr>
              <td class="col-center font-mono">${idx + 1}</td>
              <td class="col-center">${escapeHtml(item.date) || '—'}</td>
              <td class="col-right col-desc">${escapeHtml(item.details) || '—'}</td>
              <td class="col-right">${escapeHtml(item.beneficiary) || '—'}</td>
              <td class="col-right">${escapeHtml(item.category) || '—'}</td>
              <td class="col-right">${escapeHtml(item.project) || '—'}</td>
              <td class="col-center"><span class="badge-pay ${item.paymentMethod === 'بنك' ? 'badge-bank' : 'badge-cash'}">${escapeHtml(item.paymentMethod) || 'كاش'}</span></td>
              <td class="col-center font-mono">${escapeHtml(item.voucherNo || item.systemReference) || '—'}</td>
              <td class="col-center font-mono">${escapeHtml(item.invoiceNumber) || '—'}</td>
              <td class="col-amount">${(Number(item.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
              <td class="col-right col-notes">${escapeHtml(item.notes) || '—'}</td>
            </tr>
          `
            )
            .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;600;700;800&family=Cairo:wght@400;600;700;800&display=swap');
            
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: A4 landscape;
              margin: 12mm 15mm;
            }
            body {
              margin: 0;
              padding: 0;
              color: #111827;
              background-color: #ffffff;
              font-family: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Cairo', 'Tahoma', 'Arial', sans-serif;
              font-size: 9.5pt;
              line-height: 1.4;
            }

            /* رأس التقرير */
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #000000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .header-org {
              width: 33%;
              text-align: right;
            }
            .org-name {
              font-size: 11pt;
              font-weight: 800;
              color: #000000;
              margin: 0 0 2px 0;
            }
            .org-dept {
              font-size: 8.5pt;
              color: #000000;
              font-weight: 600;
            }
            .org-meta {
              font-size: 7.5pt;
              color: #4B5563;
              margin-top: 2px;
            }
            .header-center {
              width: 34%;
              text-align: center;
            }
            .report-main-title {
              font-size: 17pt;
              font-weight: 900;
              color: #000000;
              margin: 0 0 2px 0;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #000000;
              display: inline-block;
              padding-bottom: 2px;
            }
            .report-sub-title {
              font-size: 9pt;
              color: #000000;
              font-weight: 700;
              margin-top: 3px;
            }
            .header-meta {
              width: 33%;
              text-align: left;
              font-size: 8.5pt;
              color: #000000;
            }
            .header-meta table {
              margin-left: 0;
              margin-right: auto;
              border-collapse: collapse;
            }
            .header-meta td {
              padding: 1px 3px;
            }

            /* ملخص التقرير المالي */
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              background-color: #FAFAFA;
              border: 1px solid #000000;
            }
            .summary-table td {
              border: 1px solid #000000;
              padding: 5px 8px;
              font-size: 9pt;
              color: #000000;
            }

            /* تصميم جدول المصروفات */
            table.expense-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            table.expense-table thead {
              display: table-header-group;
            }
            table.expense-table tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            table.expense-table th {
              background-color: #F3F4F6 !important;
              color: #000000 !important;
              font-weight: 800;
              font-size: 9pt;
              padding: 6px 6px;
              border: 1px solid #000000;
              text-align: center;
            }
            table.expense-table td {
              border: 1px solid #000000;
              padding: 5px 6px;
              font-size: 8.5pt;
              color: #000000;
              vertical-align: middle;
            }
            table.expense-table tbody tr:nth-child(even) {
              background-color: #FAFAFA;
            }

            .col-center { text-align: center; }
            .col-right { text-align: right; }
            .font-mono { font-family: 'Consolas', 'Courier New', monospace; font-weight: 600; font-size: 8.5pt; }
            .col-desc { word-break: break-word; }
            .col-notes { word-break: break-word; font-size: 8pt; color: #000000; }
            .col-amount {
              text-align: left;
              direction: ltr;
              font-weight: 900;
              font-family: 'Consolas', 'Courier New', monospace;
              font-size: 10.5pt;
              color: #000000;
              white-space: nowrap;
            }

            .badge-pay {
              display: inline-block;
              padding: 2px 6px;
              font-size: 8pt;
              font-weight: 800;
              border-radius: 4px;
              white-space: nowrap;
            }
            .badge-cash {
              background-color: #ECFDF5;
              color: #065F46;
              border: 1px solid #A7F3D0;
            }
            .badge-bank {
              background-color: #EFF6FF;
              color: #1E40AF;
              border: 1px solid #BFDBFE;
            }

            /* صف الإجمالي الكلي */
            .total-row {
              background-color: #F3F4F6 !important;
            }
            .total-row td {
              border-top: 2px solid #000000 !important;
              border-bottom: 4px double #000000 !important;
              font-weight: 900 !important;
              font-size: 10.5pt !important;
              color: #000000 !important;
              padding: 7px 8px;
            }

            /* قسم التواقيع والاعتمادات الرسمية أسفل التقرير */
            .signatures-container {
              display: flex;
              justify-content: space-between;
              gap: 40px;
              margin-top: 20px;
              padding: 0 30px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .sig-box {
              flex: 1;
              border: 1px solid #000000;
              padding: 8px 12px;
              text-align: center;
              background-color: #FFFFFF;
            }
            .sig-box-title {
              font-size: 9.5pt;
              font-weight: 800;
              color: #000000;
              border-bottom: 1px solid #000000;
              padding-bottom: 4px;
              margin-bottom: 14px;
            }
            .sig-box-content {
              font-size: 8.5pt;
              color: #000000;
              text-align: right;
              line-height: 1.8;
            }
            .sig-dotted-line {
              border-bottom: 1px dotted #000000;
              display: inline-block;
              width: 65%;
            }

            /* التذييل */
            .report-footer {
              margin-top: 14px;
              border-top: 1px solid #000000;
              padding-top: 4px;
              display: flex;
              justify-content: space-between;
              font-size: 7.5pt;
              color: #4B5563;
            }
          </style>
        </head>
        <body>
          <!-- 1. رأس التقرير -->
          <div class="report-header">
            <div class="header-org">
              <img src="${LOGO_BASE64}" alt="شعار المؤسسة" style="max-height: 75px; max-width: 175px; object-fit: contain; margin-bottom: 6px; display: block;" />
              <div class="org-name">شركة إدارة المشاريع والخدمات العامة</div>
              <div class="org-dept">إدارة الشؤون المالية والمصروفات</div>
              <div class="org-meta">س.ت: 1010000000 | الرقم الضريبي: 300000000000003</div>
            </div>
            <div class="header-center">
              <h1 class="report-main-title">دفتر المصروفات</h1>
              <div class="report-sub-title">${options.title || 'سجل اليومية العامة المعتمدة'}</div>
            </div>
            <div class="header-meta">
              <table>
                <tr><td><strong>رقم الكشف:</strong></td><td class="font-mono">${options.journalNumber || 'JRN-' + new Date().toISOString().slice(0, 10).replace(/-/g, '')}</td></tr>
                <tr><td><strong>تاريخ اليومية:</strong></td><td>${reportDate}</td></tr>
                <tr><td><strong>تاريخ الطباعة:</strong></td><td>${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</td></tr>
              </table>
            </div>
          </div>

          <!-- 2. ملخص التقرير المالي -->
          <table class="summary-table">
            <tr>
              <td style="width: 25%;"><strong>الصندوق المالي:</strong> ${options.cashboxName || 'الصندوق الرئيسي'}</td>
              <td style="width: 25%;"><strong>تاريخ الفترة:</strong> ${reportDate}</td>
              <td style="width: 25%;"><strong>عدد السندات:</strong> <span class="font-mono font-bold">${options.rows.length}</span> سند</td>
              <td style="width: 25%;"><strong>إجمالي المصروفات:</strong> <strong>${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</strong></td>
            </tr>
          </table>

          <!-- 3. جدول المصروفات الرسمي -->
          <table class="expense-table">
            <thead>
              <tr>
                <th style="width: 3.5%;">#</th>
                <th style="width: 8.5%;">تاريخ المصروف</th>
                <th style="width: 19%;">بيان المصروف</th>
                <th style="width: 12%;">المستفيد</th>
                <th style="width: 9%;">التصنيف</th>
                <th style="width: 11%;">مركز التكلفة (المشروع)</th>
                <th style="width: 7.5%;">طريقة الدفع</th>
                <th style="width: 7.5%;">رقم السند</th>
                <th style="width: 7%;">رقم الفاتورة</th>
                <th style="width: 9%;">المبلغ</th>
                <th style="width: 6%;">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
              ${options.rows.length > 0 ? `
              <tr class="total-row">
                <td colspan="9" style="text-align: center;">الإجمالي الكلي</td>
                <td class="col-amount" style="text-align: left; font-size: 10pt; font-weight: 900;">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
                <td></td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <!-- 4. قسم التواقيع والاعتمادات الرسمية أسفل التقرير -->
          <div class="signatures-container">
            <div class="sig-box">
              <div class="sig-box-title">توقيع المشرف / المسؤول</div>
              <div class="sig-box-content">
                <div>الاسم: <span class="sig-dotted-line"></span></div>
                <div style="margin-top: 5px;">التوقيع: <span class="sig-dotted-line"></span></div>
                <div style="margin-top: 5px;">التاريخ: .... / .... / 2026 م</div>
              </div>
            </div>

            <div class="sig-box">
              <div class="sig-box-title">توقيع واعتماد الإدارة</div>
              <div class="sig-box-content">
                <div>الاعتماد: <span class="sig-dotted-line"></span></div>
                <div style="margin-top: 5px;">الختم الرسمي: [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</div>
                <div style="margin-top: 5px;">التاريخ: .... / .... / 2026 م</div>
              </div>
            </div>
          </div>

          <!-- 5. التذييل -->
          <div class="report-footer">
            <div>* مستند محاسبي رسمي صادر آلياً من نظام إدارة المصروفات وسندات الصرف.</div>
            <div>صفحة 1 من 1</div>
          </div>
        </body>
        </html>
      `;

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '12mm',
          bottom: '12mm',
          left: '15mm',
          right: '15mm',
        },
      });

      const fileName = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.end(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * توليد ملف إكسل مخصص لأي تقرير (Generic Excel Generator)
   */
  static async generateGenericExcel(options: GenericExportOptions, res: Response, filenamePrefix = 'report') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام إدارة المصروفات';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('التقرير', {
      views: [{ rightToLeft: true }],
    });

    worksheet.columns = options.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    // Rows
    options.rows.forEach((r) => {
      const row = worksheet.addRow(r);
      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const colDef = options.columns[colNumber - 1];
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colDef?.align || 'center',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        if (colDef?.isNumeric) {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // Total row if present
    if (options.totalRow) {
      const totalRowIndex = options.rows.length + 2;
      const rowData: Record<string, any> = { ...options.totalRow.values };
      const totalRow = worksheet.addRow(rowData);
      totalRow.height = 26;

      if (options.totalRow.spanCount > 1) {
        worksheet.mergeCells(totalRowIndex, 1, totalRowIndex, options.totalRow.spanCount);
      }

      totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF1F4E78' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
        cell.border = {
          top: { style: 'medium' },
          bottom: { style: 'double' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        const colDef = options.columns[colNumber - 1];
        if (colDef?.isNumeric) {
          cell.numFmt = '#,##0.00';
        }
      });
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `${filenamePrefix}_${dateStamp}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * توليد ملف PDF مخصص لأي تقرير (Generic PDF Generator)
   */
  static async generateGenericPDF(options: GenericExportOptions, res: Response, filenamePrefix = 'report') {
    let browser = null;
    try {
      const reportDate = options.reportDate || new Date().toLocaleDateString('ar-SA');

      const headersHtml = options.columns
        .map((col) => `<th style="text-align: center;">${escapeHtml(col.header)}</th>`)
        .join('');

      const rowsHtml = options.rows
        .map((row) => {
          const cells = options.columns
            .map((col) => {
              const val = row[col.key] ?? '-';
              const formattedVal =
                col.isNumeric && typeof val === 'number'
                  ? val.toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : escapeHtml(val);
              const align = col.align || 'center';
              return `<td style="text-align: ${align};">${formattedVal}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      let totalRowHtml = '';
      if (options.totalRow) {
        const remainingCols = options.columns.slice(options.totalRow.spanCount);
        const remainingCells = remainingCols
          .map((col) => {
            const val = options.totalRow?.values[col.key] ?? '';
            const formattedVal =
              col.isNumeric && typeof val === 'number'
                ? val.toLocaleString('en-US', { minimumFractionDigits: 2 })
                : escapeHtml(val);
            return `<td style="text-align: center;">${formattedVal}</td>`;
          })
          .join('');

        totalRowHtml = `
          <tr class="total-row">
            <td colspan="${options.totalRow.spanCount}" style="text-align: center;">${escapeHtml(options.totalRow.label)}</td>
            ${remainingCells}
          </tr>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            * { box-sizing: border-box; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; }
            body { margin: 0; padding: 24px; color: #2c3e50; background-color: #ffffff; font-size: 12px; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1f4e78; padding-bottom: 12px; margin-bottom: 20px; }
            .header-title h1 { margin: 0; font-size: 20px; color: #1f4e78; font-weight: 700; }
            .header-meta { font-size: 12px; color: #555; text-align: left; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #dcdde1; padding: 7px 9px; }
            th { background-color: #1f4e78; color: #ffffff; font-weight: 700; font-size: 11px; text-align: center; }
            tbody tr:nth-child(even) { background-color: #f8f9fa; }
            .total-row { background-color: #edf2f7 !important; font-weight: bold; font-size: 13px; color: #1f4e78; }
            .signatures-section { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 40px; page-break-inside: avoid; }
            .sig-box { text-align: center; width: 220px; }
            .sig-space { height: 50px; }
            .sig-line { border-top: 1.5px dashed #4b6584; margin-bottom: 8px; }
            .sig-title { font-weight: 700; font-size: 13px; color: #2f3640; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${LOGO_BASE64}" alt="شعار المؤسسة" style="max-height: 65px; max-width: 175px; object-fit: contain;" />
              <div class="header-title">
                <h1>${options.title}</h1>
                ${options.subtitle ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${options.subtitle}</div>` : ''}
              </div>
            </div>
            <div class="header-meta">
              <div><strong>تاريخ التقرير:</strong> ${reportDate}</div>
              <div><strong>عدد السجلات:</strong> ${options.rows.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="${options.columns.length}" style="text-align: center; padding: 20px;">لا توجد بيانات متاحة</td></tr>`}
              ${totalRowHtml}
            </tbody>
          </table>

          <div class="signatures-section">
            <div class="sig-box">
              <div class="sig-space"></div>
              <div class="sig-line"></div>
              <div class="sig-title">توقيع المشرف</div>
            </div>
            <div class="sig-box">
              <div class="sig-space"></div>
              <div class="sig-line"></div>
              <div class="sig-title">اعتماد الإدارة</div>
            </div>
          </div>
        </body>
        </html>
      `;

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' },
      });

      const fileName = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.end(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
