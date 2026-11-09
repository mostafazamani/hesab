/**
 * خروجی اکسل کاملاً سمت مرورگر — بدون نیاز به سرور.
 * ExcelJS فقط با dynamic import بارگذاری می‌شود تا باندل اولیه سبک بماند.
 */

import type { ContactSummary, LedgerEntry } from "@/lib/api-types";
import type { ExportContact } from "@/lib/excel";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** تبدیل داده‌های یک طرف حساب به فرمت خروجی اکسل (مرتب‌شده بر اساس تاریخ) */
export function toExportContact(
  contact: Pick<ContactSummary, "name" | "note">,
  entries: LedgerEntry[],
): ExportContact {
  return {
    name: contact.name,
    note: contact.note,
    entries: [...entries]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
      .map((e) => ({
        date: e.date,
        description: e.description,
        debit: e.debit,
        credit: e.credit,
      })),
  };
}

export function sanitizeFileNamePart(name: string): string {
  const clean = name.replace(/[\r\n"\\/:*?"<>|]/g, " ").trim() || "hesab";
  return clean.slice(0, 40);
}

/**
 * ساخت و دانلود فایل اکسل.
 * اگر فقط یک طرف حساب داده شود، فایل همان صورت‌حساب است؛
 * در غیر این صورت شیت خلاصه + یک شیت برای هر نفر ساخته می‌شود.
 */
export async function downloadExcel(contacts: ExportContact[], fileName: string): Promise<void> {
  if (contacts.length === 0) throw new Error("هنوز طرف حسابی ثبت نشده است");

  // dynamic import: exceljs فقط هنگام خروجی گرفتن لود می‌شود
  const { buildWorkbook } = await import("@/lib/excel");
  const workbook = buildWorkbook(contacts);
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer as ArrayBuffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function excelFileNameFor(contacts: ExportContact[]): string {
  if (contacts.length === 1) {
    return `صورت-حساب-${sanitizeFileNamePart(contacts[0].name)}.xlsx`;
  }
  return "صورت-حساب-ها-کل.xlsx";
}
