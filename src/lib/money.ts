const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) return String(fa);
    return String(AR_DIGITS.indexOf(ch));
  });
}

/** قالب‌بندی مبلغ برای نمایش در جدول: رقم فارسی با جداکننده هزارگان */
export function formatAmount(n: number): string {
  return n.toLocaleString("fa-IR", {
    maximumFractionDigits: 2,
  });
}

/** قالب‌بندی مبلغ با ارقام لاتین و جداکننده هزارگان (برای داخل input) */
export function formatGroupedLatin(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * تبدیل متن تایپ‌شده کاربر به عدد.
 * ارقام فارسی/عربی و جداکننده هزارگان را می‌پذیرد.
 */
export function parseAmountInput(s: string): number {
  const latin = toLatinDigits(s).replace(/[,\s٬]/g, "");
  if (!latin) return NaN;
  const n = Number(latin);
  return Number.isFinite(n) ? n : NaN;
}

/** فرمت‌کردن ورودی مبلغ حین تایپ: حذف کاراکترهای غیرمجاز و افزودن جداکننده */
export function normalizeAmountTyping(s: string): string {
  const latin = toLatinDigits(s).replace(/[^\d.]/g, "");
  // فقط یک نقطه مجاز است
  const firstDot = latin.indexOf(".");
  const clean =
    firstDot >= 0
      ? latin.slice(0, firstDot + 1) + latin.slice(firstDot + 1).replace(/\./g, "")
      : latin;
  if (!clean || clean === ".") return "";
  const [intPart, decPart] = clean.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}

/** گرد کردن مبلغ به دو رقم اعشار */
export function roundAmount(n: number): number {
  return Math.round(n * 100) / 100;
}
