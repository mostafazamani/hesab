/**
 * لایه داده کاملاً سمت مرورگر (localStorage).
 *
 * این نسخه جایگزین بک‌اند Prisma شده است تا برنامه بدون سرور — مثلاً روی
 * GitHub Pages — هم اجرا شود. تمام داده‌ها در حافظه محلی همان مرورگر
 * ذخیره می‌شود و با «پشتیبان‌گیری / بازیابی» قابل انتقال بین دستگاه‌هاست.
 */

import { compareJalali, normalizeJalaliString } from "@/lib/jalali";
import { roundAmount } from "@/lib/money";
import type { ContactDetail, ContactSummary, LedgerEntry } from "@/lib/api-types";

const STORAGE_KEY = "hesabkitab-db-v1";

export interface ContactRecord {
  id: number;
  name: string;
  note: string | null;
  createdAt: string; // ISO
}

export interface EntryRecord {
  id: number;
  contactId: number;
  date: string; // شمسی با فرمت "1404/08/18"
  description: string | null;
  debit: number; // بدهکار = پولی که به او داده‌ایم
  credit: number; // بستانکار = پولی که از او گرفته‌ایم
  createdAt: string; // ISO
}

interface DBShape {
  version: 1;
  /** آخرین شناسه استفاده‌شده؛ شناسه بعدی = seq + 1 */
  seq: number;
  contacts: ContactRecord[];
  entries: EntryRecord[];
}

function emptyDB(): DBShape {
  return { version: 1, seq: 1, contacts: [], entries: [] };
}

function loadDB(): DBShape {
  if (typeof window === "undefined") return emptyDB();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as DBShape;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.contacts) ||
      !Array.isArray(parsed.entries)
    ) {
      return emptyDB();
    }
    return {
      version: 1,
      seq: Number.isFinite(parsed.seq) ? Number(parsed.seq) : 1,
      contacts: parsed.contacts,
      entries: parsed.entries,
    };
  } catch {
    return emptyDB();
  }
}

function saveDB(db: DBShape): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // اگر حافظه پر بود، خطا را به لایه UI می‌دهیم
    throw new Error("ذخیره در حافظه مرورگر ناموفق بود");
  }
}

function toSummary(db: DBShape, contact: ContactRecord): ContactSummary {
  const entries = db.entries.filter((e) => e.contactId === contact.id);
  const totalDebit = roundAmount(entries.reduce((s, e) => s + e.debit, 0));
  const totalCredit = roundAmount(entries.reduce((s, e) => s + e.credit, 0));
  return {
    id: contact.id,
    name: contact.name,
    note: contact.note,
    createdAt: contact.createdAt,
    entryCount: entries.length,
    totalDebit,
    totalCredit,
    /** مثبت یعنی او به من بدهکار است */
    balance: roundAmount(totalDebit - totalCredit),
  };
}

// ---------- طرف حساب‌ها ----------

export function listContacts(): ContactSummary[] {
  const db = loadDB();
  return [...db.contacts]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
    .map((c) => toSummary(db, c));
}

export function getContactDetail(id: number): ContactDetail | null {
  const db = loadDB();
  const contact = db.contacts.find((c) => c.id === id);
  if (!contact) return null;
  const entries = db.entries
    .filter((e) => e.contactId === id)
    .sort((a, b) => compareJalali(a.date, b.date) || a.id - b.id);
  return { contact: toSummary(db, contact), entries };
}

export function createContact(name: string, note: string): ContactSummary {
  const clean = name.trim();
  if (!clean) throw new Error("نام طرف حساب را وارد کنید");
  const db = loadDB();
  const record: ContactRecord = {
    id: db.seq++,
    name: clean.slice(0, 80),
    note: note.trim() ? note.trim().slice(0, 300) : null,
    createdAt: new Date().toISOString(),
  };
  db.contacts.push(record);
  saveDB(db);
  return toSummary(db, record);
}

export function updateContact(id: number, name: string, note: string): ContactSummary {
  const clean = name.trim();
  if (!clean) throw new Error("نام طرف حساب را وارد کنید");
  const db = loadDB();
  const record = db.contacts.find((c) => c.id === id);
  if (!record) throw new Error("طرف حساب یافت نشد");
  record.name = clean.slice(0, 80);
  record.note = note.trim() ? note.trim().slice(0, 300) : null;
  saveDB(db);
  return toSummary(db, record);
}

export function deleteContact(id: number): void {
  const db = loadDB();
  const before = db.contacts.length;
  db.contacts = db.contacts.filter((c) => c.id !== id);
  if (db.contacts.length === before) throw new Error("طرف حساب یافت نشد");
  db.entries = db.entries.filter((e) => e.contactId !== id); // حذف آبشاری
  saveDB(db);
}

// ---------- تراکنش‌ها ----------

function validateEntryData(data: {
  date: string;
  description: string;
  debit: number;
  credit: number;
}): { date: string; description: string | null; debit: number; credit: number } {
  const date = normalizeJalaliString(data.date ?? "");
  if (!date) throw new Error("تاریخ معتبر نیست — مثلاً 1404/08/18");
  const debit = roundAmount(Math.max(0, Number(data.debit) || 0));
  const credit = roundAmount(Math.max(0, Number(data.credit) || 0));
  if (debit <= 0 && credit <= 0) throw new Error("مبلغ باید بیشتر از صفر باشد");
  if (debit > 0 && credit > 0) throw new Error("هر تراکنش فقط بدهکار یا بستانکار است، نه هر دو");
  const description = (data.description ?? "").trim();
  return { date, description: description ? description.slice(0, 300) : null, debit, credit };
}

export function createEntry(
  contactId: number,
  data: { date: string; description: string; debit: number; credit: number },
): LedgerEntry {
  const db = loadDB();
  if (!db.contacts.some((c) => c.id === contactId)) throw new Error("طرف حساب یافت نشد");
  const v = validateEntryData(data);
  const record: EntryRecord = {
    id: db.seq++,
    contactId,
    ...v,
    createdAt: new Date().toISOString(),
  };
  db.entries.push(record);
  saveDB(db);
  return record;
}

export function updateEntry(
  id: number,
  data: { date: string; description: string; debit: number; credit: number },
): LedgerEntry {
  const db = loadDB();
  const record = db.entries.find((e) => e.id === id);
  if (!record) throw new Error("تراکنش یافت نشد");
  const v = validateEntryData(data);
  record.date = v.date;
  record.description = v.description;
  record.debit = v.debit;
  record.credit = v.credit;
  saveDB(db);
  return record;
}

export function deleteEntry(id: number): void {
  const db = loadDB();
  const before = db.entries.length;
  db.entries = db.entries.filter((e) => e.id !== id);
  if (db.entries.length === before) throw new Error("تراکنش یافت نشد");
  saveDB(db);
}

// ---------- پشتیبان‌گیری و بازیابی ----------

export interface BackupData {
  version: 1;
  exportedAt: string;
  contacts: ContactRecord[];
  entries: EntryRecord[];
}

export function exportBackup(): string {
  const db = loadDB();
  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    contacts: db.contacts,
    entries: db.entries,
  };
  return JSON.stringify(backup, null, 2);
}

/** فایل پشتیبان را بررسی و نرمال می‌کند؛ بدون ذخیره‌سازی */
export function parseBackup(text: string): DBShape {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("فایل پشتیبان معتبر نیست (JSON نامعتبر)");
  }
  const data = parsed as Partial<BackupData>;
  if (!data || data.version !== 1 || !Array.isArray(data.contacts) || !Array.isArray(data.entries)) {
    throw new Error("ساختار فایل پشتیبان شناسایی نشد");
  }
  const contacts: ContactRecord[] = [];
  const seenIds = new Set<number>();
  for (const c of data.contacts) {
    if (!c || typeof c.name !== "string" || !c.name.trim()) continue;
    const id = Number(c.id);
    if (!Number.isFinite(id) || seenIds.has(id)) continue;
    seenIds.add(id);
    contacts.push({
      id,
      name: c.name.trim().slice(0, 80),
      note: typeof c.note === "string" && c.note.trim() ? c.note.trim().slice(0, 300) : null,
      createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
    });
  }
  const entries: EntryRecord[] = [];
  for (const e of data.entries) {
    if (!e) continue;
    const contactId = Number(e.contactId);
    const id = Number(e.id);
    if (!Number.isFinite(id) || !seenIds.has(contactId)) continue;
    const date = normalizeJalaliString(typeof e.date === "string" ? e.date : "");
    if (!date) continue;
    const debit = roundAmount(Math.max(0, Number(e.debit) || 0));
    const credit = roundAmount(Math.max(0, Number(e.credit) || 0));
    if (debit <= 0 && credit <= 0) continue;
    entries.push({
      id,
      contactId,
      date,
      description: typeof e.description === "string" && e.description.trim() ? e.description.trim().slice(0, 300) : null,
      debit,
      credit,
      createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date().toISOString(),
    });
  }
  const maxId = [...contacts.map((c) => c.id), ...entries.map((e) => e.id), 0].reduce(
    (a, b) => Math.max(a, b),
    0,
  );
  return { version: 1, seq: maxId + 1, contacts, entries };
}

/** جایگزینی کامل داده‌های فعلی با نسخه پشتیبان بررسی‌شده */
export function applyBackup(db: DBShape): void {
  saveDB(db);
}
