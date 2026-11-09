"use client";

import * as React from "react";
import {
  BookOpenText,
  Download,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactsPanel } from "@/components/ledger/contacts-panel";
import { LedgerView } from "@/components/ledger/ledger-view";
import { ContactDialog } from "@/components/ledger/contact-dialog";
import { ConfirmDialog } from "@/components/ledger/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/money";
import { todayJalaliString } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { downloadExcel, excelFileNameFor, toExportContact } from "@/lib/export-client";
import {
  applyBackup,
  createContact,
  createEntry,
  deleteContact,
  deleteEntry,
  exportBackup,
  getContactDetail,
  listContacts,
  parseBackup,
  updateContact,
  updateEntry,
  type DBShape,
} from "@/lib/store";
import type { ContactSummary, LedgerEntry } from "@/lib/api-types";

function saveTextFile(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function HomePage() {
  const { toast } = useToast();

  const [contacts, setContacts] = React.useState<ContactSummary[]>([]);
  const [loadingContacts, setLoadingContacts] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<ReturnType<typeof getContactDetail>>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<ContactSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ContactSummary | null>(null);
  const [editingEntry, setEditingEntry] = React.useState<LedgerEntry | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = React.useState<LedgerEntry | null>(null);

  const [exporting, setExporting] = React.useState<"all" | "one" | null>(null);
  const [pendingRestore, setPendingRestore] = React.useState<{
    db: DBShape;
    contactCount: number;
    entryCount: number;
  } | null>(null);
  const restoreInputRef = React.useRef<HTMLInputElement>(null);

  // خواندن داده‌ها از حافظه مرورگر (localStorage)
  const refreshContacts = React.useCallback(() => {
    setContacts(listContacts());
  }, []);

  const refreshDetail = React.useCallback((id: number) => {
    setDetail(getContactDetail(id));
  }, []);

  React.useEffect(() => {
    refreshContacts();
    setLoadingContacts(false);
  }, [refreshContacts]);

  React.useEffect(() => {
    setEditingEntry(null);
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    refreshDetail(selectedId);
  }, [selectedId, refreshDetail]);

  // ---------- طرف حساب‌ها ----------
  const openAddContact = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const openEditContact = (c: ContactSummary) => {
    setEditingContact(c);
    setDialogOpen(true);
  };

  const submitContact = async (name: string, note: string): Promise<boolean> => {
    try {
      const saved = editingContact
        ? updateContact(editingContact.id, name, note)
        : createContact(name, note);
      refreshContacts();
      if (editingContact && selectedId === editingContact.id) {
        refreshDetail(editingContact.id);
      }
      toast({
        title: editingContact ? "ویرایش شد" : "افزوده شد",
        description: `طرف حساب «${saved.name}» با موفقیت ${editingContact ? "ویرایش" : "افزوده"} شد.`,
      });
      return true;
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "ذخیره ناموفق بود",
        variant: "destructive",
      });
      return false;
    }
  };

  const confirmDeleteContact = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      deleteContact(target.id);
      if (selectedId === target.id) setSelectedId(null);
      refreshContacts();
      toast({
        title: "حذف شد",
        description: `طرف حساب «${target.name}» و همه تراکنش‌هایش حذف شد.`,
      });
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "حذف ناموفق بود",
        variant: "destructive",
      });
    }
  };

  // ---------- تراکنش‌ها ----------
  const submitEntry = async (data: {
    date: string;
    description: string;
    debit: number;
    credit: number;
  }): Promise<boolean> => {
    if (selectedId == null) return false;
    try {
      const saved = editingEntry
        ? updateEntry(editingEntry.id, data)
        : createEntry(selectedId, data);
      refreshContacts();
      refreshDetail(selectedId);
      if (editingEntry) {
        // پس از ویرایش موفق، فرم به حالت ثبت جدید برمی‌گردد
        setEditingEntry(null);
        toast({ title: "ویرایش شد", description: "تراکنش با موفقیت ویرایش شد." });
      } else {
        toast({
          title: "ثبت شد",
          description: `${saved.debit > 0 ? "بدهکار" : "بستانکار"} به مبلغ ${formatAmount(
            Math.max(saved.debit, saved.credit),
          )} تومان ثبت شد.`,
        });
      }
      return true;
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "ثبت ناموفق بود",
        variant: "destructive",
      });
      return false;
    }
  };

  const confirmDeleteEntry = () => {
    if (!deleteEntryTarget || selectedId == null) return;
    const target = deleteEntryTarget;
    setDeleteEntryTarget(null);
    setEditingEntry(null);
    try {
      deleteEntry(target.id);
      refreshContacts();
      refreshDetail(selectedId);
      toast({ title: "حذف شد", description: "تراکنش حذف شد." });
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "حذف ناموفق بود",
        variant: "destructive",
      });
    }
  };

  // ---------- خروجی اکسل ----------
  const handleExportAll = async () => {
    if (exporting) return;
    const summaries = listContacts();
    if (summaries.length === 0) {
      toast({ title: "خروجی اکسل", description: "هنوز طرف حسابی ثبت نشده است." });
      return;
    }
    setExporting("all");
    try {
      const exportContacts = summaries.map((c) => {
        const d = getContactDetail(c.id);
        return toExportContact(c, d?.entries ?? []);
      });
      await downloadExcel(exportContacts, excelFileNameFor(exportContacts));
      toast({
        title: "آماده شد",
        description: `فایل اکسل ${exportContacts.length.toLocaleString("fa-IR")} صورت‌حساب دانلود شد.`,
      });
    } catch (err) {
      toast({
        title: "خطا در ساخت فایل اکسل",
        description: err instanceof Error ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const handleExportOne = async () => {
    if (exporting || !detail) return;
    setExporting("one");
    try {
      const exportContacts = [toExportContact(detail.contact, detail.entries)];
      await downloadExcel(exportContacts, excelFileNameFor(exportContacts));
      toast({
        title: "آماده شد",
        description: `فایل اکسل صورت‌حساب «${detail.contact.name}» دانلود شد.`,
      });
    } catch (err) {
      toast({
        title: "خطا در ساخت فایل اکسل",
        description: err instanceof Error ? err.message : "دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  // ---------- پشتیبان‌گیری و بازیابی ----------
  const handleBackup = () => {
    try {
      const json = exportBackup();
      const datePart = todayJalaliString().replaceAll("/", "-");
      saveTextFile(json, `hesabkitab-backup-${datePart}.json`, "application/json;charset=utf-8");
      toast({ title: "پشتیبان گرفته شد", description: "فایل JSON در بخش دانلودها ذخیره شد." });
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "پشتیبان‌گیری ناموفق بود",
        variant: "destructive",
      });
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // امکان انتخاب مجدد همان فایل
    if (!file) return;
    try {
      const text = await file.text();
      const db = parseBackup(text);
      setPendingRestore({
        db,
        contactCount: db.contacts.length,
        entryCount: db.entries.length,
      });
    } catch (err) {
      toast({
        title: "بازیابی ناموفق بود",
        description: err instanceof Error ? err.message : "فایل را بررسی کنید",
        variant: "destructive",
      });
    }
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    const { db, contactCount, entryCount } = pendingRestore;
    setPendingRestore(null);
    try {
      applyBackup(db);
      refreshContacts();
      if (selectedId != null && !getContactDetail(selectedId)) setSelectedId(null);
      else if (selectedId != null) refreshDetail(selectedId);
      toast({
        title: "بازیابی شد",
        description: `${contactCount.toLocaleString("fa-IR")} طرف حساب و ${entryCount.toLocaleString(
          "fa-IR",
        )} تراکنش بازیابی شد.`,
      });
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "بازیابی ناموفق بود",
        variant: "destructive",
      });
    }
  };

  // ---------- خلاصه داشبورد ----------
  const totalReceivable = contacts.reduce((s, c) => s + Math.max(c.balance, 0), 0);
  const totalPayable = contacts.reduce((s, c) => s + Math.max(-c.balance, 0), 0);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* هدر */}
      <header className="border-b bg-background print:hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpenText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">دفتر حساب</h1>
                <p className="text-xs text-muted-foreground">حساب و کتاب شخصی، ساده و دقیق</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportAll}
                disabled={exporting === "all"}
                className="hidden h-9 gap-1.5 bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 sm:inline-flex"
                aria-label="خروجی اکسل کل"
              >
                <FileSpreadsheet className="h-4 w-4" />
                خروجی اکسل کل
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-card"
                onClick={handleBackup}
                aria-label="پشتیبان‌گیری داده‌ها"
                title="پشتیبان‌گیری داده‌ها (JSON)"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-card"
                onClick={() => restoreInputRef.current?.click()}
                aria-label="بازیابی نسخه پشتیبان"
                title="بازیابی نسخه پشتیبان (JSON)"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                ref={restoreInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFile}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>
          </div>

          {/* کارت‌های خلاصه */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border bg-card p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                طرف حساب‌ها
              </div>
              <p className="mt-1 text-sm font-bold sm:text-base">
                {contacts.length.toLocaleString("fa-IR")}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" />
                کل طلب من
              </div>
              <p className="mt-1 text-sm font-bold text-emerald-700 sm:text-base">
                {formatAmount(totalReceivable)}
                <span className="ms-1 text-[10px] font-normal">تومان</span>
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-rose-700">
                <TrendingDown className="h-3.5 w-3.5" />
                کل بدهی من
              </div>
              <p className="mt-1 text-sm font-bold text-rose-700 sm:text-base">
                {formatAmount(totalPayable)}
                <span className="ms-1 text-[10px] font-normal">تومان</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* بدنه */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">
        <div className="grid gap-4 print:block md:grid-cols-[340px_1fr]">
          <aside
            className={cn(
              "min-w-0 rounded-xl border bg-card p-3 shadow-sm print:hidden md:block md:self-start",
              selectedId != null ? "hidden" : "block",
            )}
          >
            <ContactsPanel
              contacts={contacts}
              selectedId={selectedId}
              loading={loadingContacts}
              onSelect={setSelectedId}
              onAdd={openAddContact}
              onEdit={openEditContact}
              onDelete={setDeleteTarget}
              onExportAll={handleExportAll}
              exportingAll={exporting === "all"}
            />
          </aside>

          <section className={cn("min-w-0 md:block", selectedId != null ? "block" : "hidden")}>
            {selectedId == null ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 p-10 text-center">
                <BookOpenText className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium">یک طرف حساب انتخاب کنید</p>
                <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">
                  از فهرست سمت راست یکی از طرف حساب‌ها را انتخاب کنید تا گردش حساب، جمع بدهکار و
                  بستانکار و اختلاف آن نمایش داده شود.
                </p>
              </div>
            ) : (
              <LedgerView
                detail={detail}
                loading={false}
                onBack={() => setSelectedId(null)}
                onEditContact={() => {
                  if (detail) openEditContact(detail.contact);
                }}
                onDeleteContact={() => {
                  if (detail) setDeleteTarget(detail.contact);
                }}
                onSubmitEntry={submitEntry}
                onCancelEditEntry={() => setEditingEntry(null)}
                editingEntry={editingEntry}
                onEditEntry={(e) => {
                  setEditingEntry(e);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDeleteEntry={(e) => setDeleteEntryTarget(e)}
                onExportExcel={handleExportOne}
                exportingExcel={exporting === "one"}
              />
            )}
          </section>
        </div>
      </main>

      {/* فوتر */}
      <footer className="mt-auto border-t bg-background print:hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-[11px] text-muted-foreground">
          دفتر حساب — بدهکار یعنی پولی که داده‌اید، بستانکار یعنی پولی که گرفته‌اید. داده‌ها فقط در
          مرورگر همین دستگاه ذخیره می‌شود؛ برای انتقال بین دستگاه‌ها از پشتیبان‌گیری استفاده کنید.
        </div>
      </footer>

      {/* دیالوگ‌ها */}
      <ContactDialog
        open={dialogOpen}
        editing={editingContact}
        onClose={() => setDialogOpen(false)}
        onSubmit={submitContact}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="حذف طرف حساب"
        description={`آیا از حذف «${deleteTarget?.name ?? ""}» و همه تراکنش‌های آن مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
        onConfirm={confirmDeleteContact}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={deleteEntryTarget != null}
        title="حذف تراکنش"
        description={`آیا از حذف تراکنش مبلغ ${formatAmount(
          Math.max(deleteEntryTarget?.debit ?? 0, deleteEntryTarget?.credit ?? 0),
        )} تومان مطمئن هستید؟`}
        onConfirm={confirmDeleteEntry}
        onCancel={() => setDeleteEntryTarget(null)}
      />

      <ConfirmDialog
        open={pendingRestore != null}
        title="بازیابی نسخه پشتیبان"
        description={`همه داده‌های فعلی با محتوای فایل جایگزین می‌شود: ${
          pendingRestore?.contactCount.toLocaleString("fa-IR") ?? "0"
        } طرف حساب و ${
          pendingRestore?.entryCount.toLocaleString("fa-IR") ?? "0"
        } تراکنش. ادامه می‌دهید؟`}
        confirmLabel="بله، بازیابی کن"
        onConfirm={confirmRestore}
        onCancel={() => setPendingRestore(null)}
      />
    </div>
  );
}
