import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { Response } from 'express';

export interface ExpenseExportRow {
  index?: number;
  paymentMethod: string;
  voucherNo: string;
  date: string;
  beneficiary: string;
  details: string;
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
      { header: 'نوع الدفع', key: 'paymentMethod', width: 16 },
      { header: 'رقم السند', key: 'voucherNo', width: 18 },
      { header: 'التاريخ', key: 'date', width: 14 },
      { header: 'المستفيد', key: 'beneficiary', width: 28 },
      { header: 'التفاصيل', key: 'details', width: 36 },
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
        paymentMethod: item.paymentMethod || '-',
        voucherNo: item.voucherNo || '-',
        date: item.date || '-',
        beneficiary: item.beneficiary || '-',
        details: item.details || '-',
        amount: amt,
      });

      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 5 || colNumber === 6 ? 'right' : 'center',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        if (colNumber === 7) {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // إضافة صف الإجمالي
    const totalRowIndex = options.rows.length + 2;
    const totalRow = worksheet.addRow({
      index: '',
      paymentMethod: '',
      voucherNo: '',
      date: '',
      beneficiary: '',
      details: 'إجمالي المصروفات',
      amount: options.totalAmount !== undefined ? options.totalAmount : totalSum,
    });

    totalRow.height = 26;
    worksheet.mergeCells(`A${totalRowIndex}:F${totalRowIndex}`);

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
      if (colNumber <= 6) {
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

      const tableRowsHtml = options.rows
        .map(
          (item, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: center;">${item.paymentMethod || '-'}</td>
          <td style="text-align: center; font-family: monospace;">${item.voucherNo || '-'}</td>
          <td style="text-align: center;">${item.date || '-'}</td>
          <td>${item.beneficiary || '-'}</td>
          <td>${item.details || '-'}</td>
          <td style="text-align: center; font-weight: bold;">${(Number(item.amount) || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}</td>
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
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            
            * {
              box-sizing: border-box;
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            }
            body {
              margin: 0;
              padding: 24px;
              color: #2c3e50;
              background-color: #ffffff;
              font-size: 12px;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1f4e78;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header-title h1 {
              margin: 0;
              font-size: 20px;
              color: #1f4e78;
              font-weight: 700;
            }
            .header-meta {
              font-size: 12px;
              color: #555;
              text-align: left;
            }
            .header-meta div {
              margin-bottom: 3px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            th, td {
              border: 1px solid #dcdde1;
              padding: 7px 9px;
            }
            th {
              background-color: #1f4e78;
              color: #ffffff;
              font-weight: 700;
              font-size: 11px;
              text-align: center;
            }
            tbody tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .total-row {
              background-color: #edf2f7 !important;
              font-weight: bold;
              font-size: 13px;
              color: #1f4e78;
            }
            
            /* خانات التوقيع والاعتماد أسفل التقرير */
            .signatures-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              padding: 0 40px;
              page-break-inside: avoid;
            }
            .sig-box {
              text-align: center;
              width: 220px;
            }
            .sig-space {
              height: 50px;
            }
            .sig-line {
              border-top: 1.5px dashed #4b6584;
              margin-bottom: 8px;
            }
            .sig-title {
              font-weight: 700;
              font-size: 13px;
              color: #2f3640;
            }
          </style>
        </head>
        <body>
          <!-- ترويسة التقرير -->
          <div class="header-container">
            <div class="header-title">
              <h1>${options.title || 'جدول المصروفات اليومية'}</h1>
              ${options.journalNumber ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">رقم اليومية: <strong>${options.journalNumber}</strong> ${options.cashboxName ? `| الصندوق: ${options.cashboxName}` : ''}</div>` : ''}
            </div>
            <div class="header-meta">
              <div><strong>تاريخ التقرير:</strong> ${reportDate}</div>
              <div><strong>عدد السندات:</strong> ${options.rows.length}</div>
            </div>
          </div>

          <!-- جدول البيانات -->
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">م</th>
                <th style="width: 14%;">نوع الدفع</th>
                <th style="width: 15%;">رقم السند</th>
                <th style="width: 13%;">التاريخ</th>
                <th style="width: 23%;">المستفيد</th>
                <th style="width: 18%;">التفاصيل</th>
                <th style="width: 12%;">المبلغ (ر.س)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">لا توجد مصروفات مسجلة</td></tr>'}
              <tr class="total-row">
                <td colspan="6" style="text-align: center;">إجمالي المصروفات</td>
                <td style="text-align: center;">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <!-- خانات التوقيع والاعتماد -->
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '10mm',
          right: '10mm',
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
        .map((col) => `<th style="text-align: center;">${col.header}</th>`)
        .join('');

      const rowsHtml = options.rows
        .map((row) => {
          const cells = options.columns
            .map((col) => {
              const val = row[col.key] ?? '-';
              const formattedVal =
                col.isNumeric && typeof val === 'number'
                  ? val.toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : val;
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
                : val;
            return `<td style="text-align: center;">${formattedVal}</td>`;
          })
          .join('');

        totalRowHtml = `
          <tr class="total-row">
            <td colspan="${options.totalRow.spanCount}" style="text-align: center;">${options.totalRow.label}</td>
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
            <div class="header-title">
              <h1>${options.title}</h1>
              ${options.subtitle ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${options.subtitle}</div>` : ''}
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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
