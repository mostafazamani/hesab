"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  Printer,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntryForm } from "@/components/ledger/entry-form";
import { formatAmount, toLatinDigits } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ContactDetail, LedgerEntry } from "@/lib/api-types";

interface LedgerViewProps {
  detail: ContactDetail | null;
  loading: boolean;
  onBack: () => void;
  onEditContact: () => void;
  onDeleteContact: () => void;
  onEditEntry: (entry: LedgerEntry) => void;
  onDeleteEntry: (entry: LedgerEntry) => void;
  onSubmitEntry: (data: {
    date: string;
    description: string;
    debit: number;
    credit: number;
  }) => Promise<boolean>;
  onCancelEditEntry: () => void;
  editingEntry: LedgerEntry | null;
  onExportExcel: () => void;
  exportingExcel?: boolean;
}

function statusSentence(name: string, diff: number) {
  const abs = formatAmount(Math.abs(diff));
  if (diff > 0.0001) {
    return {
      text: `${name} به شما بدهکار است — طلب شما: ${abs} تومان`,
      cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    };
  }
  if (diff < -0.0001) {
    return {
      text: `شما به ${name} بدهکار هستید — بدهی شما: ${abs} تومان`,
      cls: "bg-rose-50 text-rose-800 ring-rose-200",
      icon: <CheckCircle2 className="h-5 w-5 text-rose-600" />,
    };
  }
  return {
    text: "حساب تسویه است — بدهکار و بستانکار برابرند",
    cls: "bg-muted text-foreground ring-border",
    icon: <CheckCircle2 className="h-5 w-5 text-muted-foreground" />,
  };
}

export function LedgerView({
  detail,
  loading,
  onBack,
  onEditContact,
  onDeleteContact,
  onEditEntry,
  onDeleteEntry,
  onSubmitEntry,
  onCancelEditEntry,
  editingEntry,
  onExportExcel,
  exportingExcel,
}: LedgerViewProps) {
  const [entryQuery, setEntryQuery] = React.useState("");

  // هنگام تغییر طرف حساب، فیلتر پاک شود
  React.useEffect(() => {
    setEntryQuery("");
  }, [detail?.contact.id]);

  const entries = React.useMemo(() => {
    if (!detail) return [];
    const q = toLatinDigits(entryQuery.trim().toLowerCase());
    if (!q) return detail.entries;
    return detail.entries.filter(
      (e) =>
        (e.description ?? "").toLowerCase().includes(q) || toLatinDigits(e.date).includes(q),
    );
  }, [detail, entryQuery]);

  if (loading || !detail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const { contact } = detail;
  const totalDebit = contact.totalDebit;
  const totalCredit = contact.totalCredit;
  const diff = contact.balance;
  const status = statusSentence(contact.name, diff);

  // محاسبه مانده تجمعی برای ردیف‌های نمایش‌داده‌شده
  const rowsWithBalance = entries.reduce<{ entry: LedgerEntry; balance: number }[]>(
    (acc, e) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      acc.push({
        entry: e,
        balance: Math.round((prevBalance + e.debit - e.credit) * 100) / 100,
      });
      return acc;
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* کارت اطلاعات طرف حساب */}
      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 md:hidden"
              onClick={onBack}
              aria-label="بازگشت به فهرست"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Wallet className="h-5 w-5 text-primary" />
                {contact.name}
              </h2>
              {contact.note ? (
                <p className="mt-1 text-xs text-muted-foreground">{contact.note}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {contact.entryCount.toLocaleString("fa-IR")} تراکنش ثبت شده
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onEditContact}>
              <Pencil className="h-3.5 w-3.5" />
              ویرایش
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={onDeleteContact}
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
              aria-label="چاپ صورت حساب"
            >
              <Printer className="h-3.5 w-3.5" />
              چاپ
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onExportExcel}
              disabled={exportingExcel}
              aria-label="خروجی اکسل این صورت حساب"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exportingExcel ? "در حال ساخت فایل..." : "خروجی اکسل"}
            </Button>
          </div>
        </div>
      </div>

      {/* فرم ثبت تراکنش */}
      <div className="print:hidden">
        <EntryForm
          contactId={contact.id}
          editing={editingEntry}
          onSubmit={onSubmitEntry}
          onCancelEdit={onCancelEditEntry}
        />
      </div>

      {/* جدول تراکنش‌ها */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <h3 className="text-sm font-semibold">گردش حساب</h3>
          {detail.entries.length > 0 && (
            <div className="relative w-full max-w-56 print:hidden">
              <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={entryQuery}
                onChange={(e) => setEntryQuery(e.target.value)}
                placeholder="جستجو در شرح یا تاریخ..."
                className="h-8 pr-8 text-xs"
                aria-label="جستجو در تراکنش ها"
              />
            </div>
          )}
        </div>

        {detail.entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              هنوز تراکنشی ثبت نشده است. اولین مبلغ را از فرم بالا ثبت کنید.
            </p>
          </div>
        ) : (
          <div className="max-h-[440px] overflow-auto scroll-thin print-open">
            <Table className="min-w-[640px]">
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="w-24 text-center">تاریخ</TableHead>
                  <TableHead>شرح</TableHead>
                  <TableHead className="w-32 text-center text-rose-600">بدهکار</TableHead>
                  <TableHead className="w-32 text-center text-emerald-600">بستانکار</TableHead>
                  <TableHead className="w-32 text-center">مانده</TableHead>
                  <TableHead className="w-20 text-center print:hidden">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                      موردی مطابق جستجو پیدا نشد.
                    </TableCell>
                  </TableRow>
                ) : (
                  rowsWithBalance.map(({ entry, balance }, idx) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(idx + 1).toLocaleString("fa-IR", { useGrouping: false })}
                      </TableCell>
                      <TableCell className="text-center text-xs" dir="ltr">
                        {entry.date}
                      </TableCell>
                      <TableCell className="max-w-52 truncate text-sm" title={entry.description ?? ""}>
                        {entry.description || "—"}
                      </TableCell>
                      <TableCell className="text-center text-sm font-semibold text-rose-600">
                        {entry.debit > 0 ? formatAmount(entry.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-center text-sm font-semibold text-emerald-600">
                        {entry.credit > 0 ? formatAmount(entry.credit) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            balance > 0.0001
                              ? "text-emerald-600"
                              : balance < -0.0001
                                ? "text-rose-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {formatAmount(balance)}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {balance > 0.0001 ? "طلب از او" : balance < -0.0001 ? "بدهی به او" : "تسویه"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center print:hidden">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEditEntry(entry)}
                            aria-label="ویرایش تراکنش"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteEntry(entry)}
                            aria-label="حذف تراکنش"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* جمع کل و اختلاف */}
      {detail.entries.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-center sm:p-4">
              <p className="text-[11px] font-medium text-rose-700">جمع بدهکار</p>
              <p className="mt-1 text-sm font-bold text-rose-700 sm:text-lg">
                {formatAmount(totalDebit)}
                <span className="ms-1 text-[10px] font-normal">تومان</span>
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center sm:p-4">
              <p className="text-[11px] font-medium text-emerald-700">جمع بستانکار</p>
              <p className="mt-1 text-sm font-bold text-emerald-700 sm:text-lg">
                {formatAmount(totalCredit)}
                <span className="ms-1 text-[10px] font-normal">تومان</span>
              </p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center sm:p-4">
              <p className="text-[11px] font-medium text-muted-foreground">اختلاف</p>
              <p
                className={cn(
                  "mt-1 text-sm font-bold sm:text-lg",
                  diff > 0.0001 ? "text-emerald-600" : diff < -0.0001 ? "text-rose-600" : "text-muted-foreground",
                )}
              >
                {formatAmount(Math.abs(diff))}
                <span className="ms-1 text-[10px] font-normal text-muted-foreground">تومان</span>
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center justify-center gap-2 rounded-xl p-4 text-center text-sm font-semibold leading-relaxed ring-1",
              status.cls,
            )}
            role="status"
          >
            {status.icon}
            <span className="break-words">{status.text}</span>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            بدهکار = پولی که به او داده‌اید (خروج پول) • بستانکار = پولی که از او گرفته‌اید (ورود پول) •
            اختلاف = جمع بدهکار − جمع بستانکار
          </p>
        </div>
      )}
    </div>
  );
}
