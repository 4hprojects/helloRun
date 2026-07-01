const ExcelJS = require('exceljs');

function csvEscape(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildCsvContent(headers, rows) {
  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
}

async function buildXlsxBuffer({ sheetName, headers, rows, creator = 'HelloRun' }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = creator;
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(sheetName || 'Sheet1');
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      maxLength = Math.max(maxLength, String(cell.value || '').length);
    });
    column.width = Math.min(maxLength + 2, 48);
  });
  return workbook.xlsx.writeBuffer();
}

async function buildMultiSheetXlsxBuffer({ sheets, creator = 'HelloRun' }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = creator;
  workbook.created = new Date();
  sheets.forEach(({ sheetName, headers, rows }) => {
    const worksheet = workbook.addWorksheet(sheetName || 'Sheet1');
    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        maxLength = Math.max(maxLength, String(cell.value || '').length);
      });
      column.width = Math.min(maxLength + 2, 48);
    });
  });
  return workbook.xlsx.writeBuffer();
}

function buildExportFilename(prefix, extension) {
  const safePrefix = String(prefix || 'export').replace(/[^a-zA-Z0-9-_]/g, '');
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safePrefix}-${timestamp}.${extension}`;
}

module.exports = {
  csvEscape,
  buildCsvContent,
  buildXlsxBuffer,
  buildMultiSheetXlsxBuffer,
  buildExportFilename
};
