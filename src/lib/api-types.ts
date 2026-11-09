/** تایپ‌های مشترک بین کلاینت و سرور */

export interface ContactSummary {
  id: number;
  name: string;
  note: string | null;
  createdAt: string;
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  /** totalDebit - totalCredit؛ مثبت یعنی او به من بدهکار است */
  balance: number;
}

export interface LedgerEntry {
  id: number;
  contactId: number;
  date: string;
  description: string | null;
  debit: number;
  credit: number;
  createdAt: string;
}

export interface ContactDetail {
  contact: ContactSummary;
  entries: LedgerEntry[];
}
