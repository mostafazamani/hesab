import ExcelJS from "exceljs";
import { todayJalaliString } from "@/lib/jalali";

export interface ExportEntry {
  date: string;
  description: string | null;
  debit: number;
  credit: number;
}

export interface ExportContact {
  name: string;
  note?: string | null;
  entries: ExportEntry[];
}

const HEADER_FILL = "FF374151";
const TITLE_FILL = "FF1F2937";
const ZEBRA_FILL = "FFF9FAFB";
const TOTAL_FILL = "FFE5E7EB";
const DEBIT_COLOR = "FFB91C1C"; // قرمز - بدهکار
const CREDIT_COLOR = "FF047857"; // سبز - بستانکار
const BORDER_COLOR = "FFD1D5DB";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** ساخت وضعیت متنی مانده */
export function balanceStatus(name: string, balance: number): string {
  const abs = Math.abs(balance);
  const fmt = (v: number) => v.toLocaleString("en-US");
  if (balance > 0.0001) return `${name} به شما ${fmt(abs)} تومان بدهکار است`;
  if (balance < -0.0001) return `شما به ${name} ${fmt(abs)} تومان بدهکار هستید`;
  return "حساب تسویه است";
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  let clean = name.replace(/[\\/*?:[\]]/g, " ").trim() || "صورت‌حساب";
  clean = clean.slice(0, 28);
  let candidate = clean;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${clean} (${i})`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } },
    };
  });
}

/** افزودن یک شیت کامل صورت‌حساب برای یک طرف حساب */
function addContactSheet(wb: ExcelJS.Workbook, sheetName: string, contact: ExportContact) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }],
  });

  ws.columns = [
    { key: "rowNo", width: 7 },
    { key: "date", width: 13 },
    { key: "description", width: 36 },
    { key: "debit", width: 16 },
    { key: "credit", width: 16 },
    { key: "balance", width: 17 },
  ];

  // عنوان اصلی
  const titleRow = ws.addRow([`صورت‌حساب: ${contact.name}`]);
  ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`);
  titleRow.height = 26;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  // تاریخ گزارش و واحد پول
  const metaRow = ws.addRow([
    `تاریخ گزارش: ${todayJalaliString()}`,
    "",
    contact.note ? `یادداشت: ${contact.note}` : "",
    "",
    "",
    "واحد: تومان",
  ]);
  ws.mergeCells(`A${metaRow.number}:C${metaRow.number}`);
  metaRow.getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };
  metaRow.getCell(6).font = { size: 10, color: { argb: "FF6B7280" } };
  metaRow.getCell(6).alignment = { horizontal: "left" };

  ws.addRow([]);

  // سرستون‌ها
  const header = ws.addRow(["ردیف", "تاریخ", "شرح", "بدهکار", "بستانکار", "مانده"]);
  styleHeaderRow(header);

  // ردیف‌های تراکنش با مانده تجمعی
  let cumDebit = 0;
  let cumCredit = 0;
  contact.entries.forEach((e, idx) => {
    cumDebit += e.debit;
    cumCredit += e.credit;
    const balance = round(cumDebit - cumCredit);
    const row = ws.addRow([
      idx + 1,
      e.date,
      e.description ?? "",
      round(e.debit),
      round(e.credit),
      balance,
    ]);
    row.eachCell((cell, col) => {
      cell.border = {
        top: { style: "hair", color: { argb: BORDER_COLOR } },
        bottom: { style: "hair", color: { argb: BORDER_COLOR } },
        left: { style: "thin", color: { argb: BORDER_COLOR } },
        right: { style: "thin", color: { argb: BORDER_COLOR } },
      };
      cell.alignment = { horizontal: col === 3 ? "right" : "center", vertical: "middle" };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
      }
    });
    row.getCell(4).font = { color: { argb: DEBIT_COLOR } };
    row.getCell(5).font = { color: { argb: CREDIT_COLOR } };
    const balCell = row.getCell(6);
    balCell.numFmt = "#,##0.##";
    balCell.font = {
      bold: true,
      color: { argb: balance > 0.0001 ? CREDIT_COLOR : balance < -0.0001 ? DEBIT_COLOR : "FF6B7280" },
    };
    row.getCell(4).numFmt = "#,##0.##";
    row.getCell(5).numFmt = "#,##0.##";
  });

  const totalDebit = round(contact.entries.reduce((s, e) => s + e.debit, 0));
  const totalCredit = round(contact.entries.reduce((s, e) => s + e.credit, 0));
  const diff = round(totalDebit - totalCredit);

  // ردیف جمع کل
  const totalRow = ws.addRow([
    "",
    "",
    "جمع کل",
    totalDebit,
    totalCredit,
    diff,
  ]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
    cell.border = {
      top: { style: "double", color: { argb: "FF6B7280" } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(4).numFmt = "#,##0.##";
  totalRow.getCell(5).numFmt = "#,##0.##";
  totalRow.getCell(6).numFmt = "#,##0.##";

  // اختلاف و وضعیت
  const diffRow = ws.addRow(["", "", "اختلاف (بدهکار − بستانکار)", "", "", ""]);
  ws.mergeCells(`A${diffRow.number}:C${diffRow.number}`);
  diffRow.getCell(3).font = { bold: true };
  diffRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };

  const statusRow = ws.addRow(["", "", balanceStatus(contact.name, diff)]);
  ws.mergeCells(`C${statusRow.number}:F${statusRow.number}`);
  statusRow.getCell(3).font = { bold: true, color: { argb: diff > 0.0001 ? CREDIT_COLOR : diff < -0.0001 ? DEBIT_COLOR : "FF374151" } };
  statusRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };

  return ws;
}

/** شیت خلاصه کل طرف حساب‌ها */
function addSummarySheet(wb: ExcelJS.Workbook, contacts: ExportContact[]) {
  const ws = wb.addWorksheet("خلاصه", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }],
  });
  ws.columns = [
    { width: 7 },
    { width: 30 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 34 },
  ];

  const titleRow = ws.addRow(["خلاصه کل صورت‌حساب‌ها"]);
  ws.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.height = 26;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const metaRow = ws.addRow([`تاریخ گزارش: ${todayJalaliString()}`, "", "", "", "", "", "واحد: تومان"]);
  metaRow.getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };
  metaRow.getCell(7).font = { size: 10, color: { argb: "FF6B7280" } };

  ws.addRow([]);

  const header = ws.addRow([
    "ردیف",
    "طرف حساب",
    "تعداد تراکنش",
    "جمع بدهکار",
    "جمع بستانکار",
    "مانده",
    "وضعیت",
  ]);
  styleHeaderRow(header);

  let sumD = 0;
  let sumC = 0;
  contacts.forEach((c, idx) => {
    const d = round(c.entries.reduce((s, e) => s + e.debit, 0));
    const cr = round(c.entries.reduce((s, e) => s + e.credit, 0));
    const bal = round(d - cr);
    sumD += d;
    sumC += cr;
    const row = ws.addRow([idx + 1, c.name, c.entries.length, d, cr, bal, balanceStatus(c.name, bal)]);
    row.eachCell((cell, col) => {
      cell.border = {
        top: { style: "hair", color: { argb: BORDER_COLOR } },
        bottom: { style: "hair", color: { argb: BORDER_COLOR } },
        left: { style: "thin", color: { argb: BORDER_COLOR } },
        right: { style: "thin", color: { argb: BORDER_COLOR } },
      };
      cell.alignment = { horizontal: col === 2 || col === 7 ? "right" : "center", vertical: "middle" };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
      }
    });
    row.getCell(4).numFmt = "#,##0.##";
    row.getCell(5).numFmt = "#,##0.##";
    row.getCell(6).numFmt = "#,##0.##";
    row.getCell(6).font = {
      bold: true,
      color: { argb: bal > 0.0001 ? CREDIT_COLOR : bal < -0.0001 ? DEBIT_COLOR : "FF6B7280" },
    };
  });

  const totalRow = ws.addRow([
    "",
    "جمع کل",
    contacts.reduce((s, c) => s + c.entries.length, 0),
    round(sumD),
    round(sumC),
    round(sumD - sumC),
    "",
  ]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
    cell.border = { top: { style: "double", color: { argb: "FF6B7280" } } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(4).numFmt = "#,##0.##";
  totalRow.getCell(5).numFmt = "#,##0.##";
  totalRow.getCell(6).numFmt = "#,##0.##";

  return ws;
}

/**
 * ساخت ورک‌بوک اکسل.
 * اگر فقط یک طرف حساب داده شود، شیت همان صورت‌حساب ساخته می‌شود؛
 * در غیر این صورت یک شیت «خلاصه» به‌علاوه یک شیت برای هر طرف حساب ساخته می‌شود.
 */
export function buildWorkbook(contacts: ExportContact[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "دفتر حساب";
  wb.created = new Date();

  const used = new Set<string>();
  if (contacts.length === 1) {
    addContactSheet(wb, sanitizeSheetName(contacts[0].name, used), contacts[0]);
  } else {
    addSummarySheet(wb, contacts);
    for (const c of contacts) {
      addContactSheet(wb, sanitizeSheetName(c.name, used), c);
    }
  }
  return wb;
}
