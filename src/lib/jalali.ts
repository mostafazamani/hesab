import {
  jalaaliMonthLength as jalaaliMonthLengthJs,
  toGregorian,
  toJalaali,
} from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** روزهای هفته با شروع از شنبه */
export const JALALI_WEEKDAYS_SHORT = [
  "ش",
  "ی",
  "د",
  "س",
  "چ",
  "پ",
  "ج",
];

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function jalaliToString(d: JDate): string {
  return `${d.jy}/${pad2(d.jm)}/${pad2(d.jd)}`;
}

/** تاریخ امروز به وقت تهران، به صورت شمسی */
export function todayJalali(): JDate {
  // گرفتن بخش‌های تاریخ به وقت تهران
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [gy, gm, gd] = parts.split("-").map(Number);
  return toJalaali(gy, gm, gd);
}

export function todayJalaliString(): string {
  return jalaliToString(todayJalali());
}

/** تبدیل تاریخ شمسی به ایندکس روز هفته؛ 0=شنبه ... 6=جمعه */
export function weekdayIndex(jy: number, jm: number, jd: number): number {
  const g = toGregorian(jy, jm, jd);
  const d = new Date(g.gy, g.gm - 1, g.gd);
  return (d.getDay() + 1) % 7;
}

/** پارس رشته تاریخ شمسی؛ ورودی‌های «1404/8/18» یا «1404-08-18» را هم قبول می‌کند */
export function parseJalaliString(s: string): JDate | null {
  if (!s) return null;
  const cleaned = s.trim().replace(/[-.]/g, "/");
  const m = cleaned.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (jy < 1000 || jy > 1500) return null;
  if (jm < 1 || jm > 12) return null;
  if (jd < 1 || jd > 31) return null;
  // اعتبارسنجی واقعی با تبدیل رفت‌وبرگشت
  try {
    const g = toGregorian(jy, jm, jd);
    const back = toJalaali(g.gy, g.gm, g.gd);
    if (back.jy !== jy || back.jm !== jm || back.jd !== jd) return null;
  } catch {
    return null;
  }
  return { jy, jm, jd };
}

/** نرمال‌سازی رشته تاریخ به «1404/08/18»؛ اگر نامعتبر باشد null برمی‌گرداند */
export function normalizeJalaliString(s: string): string | null {
  const d = parseJalaliString(s);
  return d ? jalaliToString(d) : null;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaaliMonthLengthJs(jy, jm);
}

/** مقایسه دو رشته تاریخ شمسی (فرمت نرمال‌شده) برای مرتب‌سازی صعودی */
export function compareJalali(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** برچسب خوانای تاریخ: «۱۸ آبان ۱۴۰۴» */
export function jalaliLongLabel(s: string): string {
  const d = parseJalaliString(s);
  if (!d) return s;
  return `${d.jd} ${JALALI_MONTHS[d.jm - 1]} ${d.jy}`;
}
