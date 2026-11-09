"use client";

import * as React from "react";
import { FileSpreadsheet, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ContactSummary } from "@/lib/api-types";

interface ContactsPanelProps {
  contacts: ContactSummary[];
  selectedId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onEdit: (contact: ContactSummary) => void;
  onDelete: (contact: ContactSummary) => void;
  onExportAll: () => void;
  exportingAll?: boolean;
}

function balanceBadge(balance: number) {
  if (balance > 0.0001) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        طلب از او: {formatAmount(balance)}
      </span>
    );
  }
  if (balance < -0.0001) {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
        بدهی به او: {formatAmount(Math.abs(balance))}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
      تسویه
    </span>
  );
}

export function ContactsPanel({
  contacts,
  selectedId,
  loading,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onExportAll,
  exportingAll,
}: ContactsPanelProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی طرف حساب..."
            className="pr-9"
            aria-label="جستجوی طرف حساب"
          />
        </div>
        <Button onClick={onAdd} size="icon" className="h-10 w-10 shrink-0" aria-label="افزودن طرف حساب">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scroll-thin md:max-h-[calc(100vh-320px)]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              هنوز طرف حسابی ثبت نشده است.
              <br />
              اولین نفر را با دکمه <span className="font-semibold text-foreground">+</span> اضافه کنید.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">موردی مطابق جستجو پیدا نشد.</p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(c.id)}
              className={cn(
                "group cursor-pointer rounded-xl border p-3 transition-colors hover:bg-accent/60",
                selectedId === c.id ? "border-primary/60 bg-accent" : "bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  {c.note ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.note}</p> : null}
                  <div className="mt-1.5">{balanceBadge(c.balance)}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{c.entryCount.toLocaleString("fa-IR")} تراکنش</p>
                </div>
                <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(c);
                    }}
                    aria-label={`ویرایش ${c.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c);
                    }}
                    aria-label={`حذف ${c.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {contacts.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-2 bg-card text-sm font-medium"
          onClick={onExportAll}
          disabled={exportingAll}
          aria-label="خروجی اکسل همه صورت حساب ها"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          {exportingAll ? "در حال ساخت فایل..." : "خروجی اکسل همه صورت‌حساب‌ها"}
        </Button>
      )}
    </div>
  );
}
