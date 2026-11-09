"use client";

import * as React from "react";
import { Banknote, HandCoins, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ledger/amount-input";
import { JalaliDatePicker } from "@/components/ledger/jalali-date-picker";
import { todayJalaliString } from "@/lib/jalali";
import { formatGroupedLatin } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { LedgerEntry } from "@/lib/api-types";

interface EntryFormProps {
  contactId: number;
  /** تراکنش در حال ویرایش؛ null یعنی حالت ثبت جدید */
  editing: LedgerEntry | null;
  onSubmit: (data: {
    date: string;
    description: string;
    debit: number;
    credit: number;
  }) => Promise<boolean>;
  onCancelEdit: () => void;
}

type EntryType = "debit" | "credit";

export function EntryForm({ contactId, editing, onSubmit, onCancelEdit }: EntryFormProps) {
  const todayStr = React.useMemo(() => todayJalaliString(), []);

  const [type, setType] = React.useState<EntryType>("debit");
  const [amount, setAmount] = React.useState("");
  const [rawAmount, setRawAmount] = React.useState(0);
  const [date, setDate] = React.useState(todayStr);
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setType(editing.debit > 0 ? "debit" : "credit");
      const val = editing.debit > 0 ? editing.debit : editing.credit;
      setAmount(formatGroupedLatin(val));
      setRawAmount(val);
      setDate(editing.date);
      setDescription(editing.description ?? "");
    } else {
      setAmount("");
      setRawAmount(0);
      setDate(todayStr);
      setDescription("");
      setType("debit");
    }
  }, [editing, todayStr, contactId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const debit = type === "debit" ? rawAmount : 0;
    const credit = type === "credit" ? rawAmount : 0;
    const ok = await onSubmit({ date, description, debit, credit });
    if (ok && !editing) {
      setAmount("");
      setRawAmount(0);
      setDescription("");
    }
  };

  const isDebit = type === "debit";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {editing ? "ویرایش تراکنش" : "ثبت تراکنش جدید"}
        </h3>
        {editing && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit} className="h-8 gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            انصراف از ویرایش
          </Button>
        )}
      </div>

      {/* نوع تراکنش */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("debit")}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
            isDebit
              ? "border-rose-400 bg-rose-50 ring-1 ring-rose-300"
              : "bg-card hover:bg-accent/60",
          )}
          aria-pressed={isDebit}
        >
          <Banknote className={cn("h-5 w-5", isDebit ? "text-rose-600" : "text-muted-foreground")} />
          <span className={cn("text-sm font-semibold", isDebit && "text-rose-700")}>پول به او دادم</span>
          <span className={cn("text-[11px]", isDebit ? "text-rose-600" : "text-muted-foreground")}>بدهکار</span>
        </button>
        <button
          type="button"
          onClick={() => setType("credit")}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
            !isDebit
              ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300"
              : "bg-card hover:bg-accent/60",
          )}
          aria-pressed={!isDebit}
        >
          <HandCoins className={cn("h-5 w-5", !isDebit ? "text-emerald-600" : "text-muted-foreground")} />
          <span className={cn("text-sm font-semibold", !isDebit && "text-emerald-700")}>پول از او گرفتم</span>
          <span className={cn("text-[11px]", !isDebit ? "text-emerald-600" : "text-muted-foreground")}>بستانکار</span>
        </button>
      </div>

      {/* مبلغ و تاریخ */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="entry-amount" className="text-xs font-medium text-muted-foreground">
            مبلغ (تومان)
          </label>
          <AmountInput
            id="entry-amount"
            value={amount}
            onValueChange={(display, raw) => {
              setAmount(display);
              setRawAmount(raw);
            }}
            placeholder="مثلاً 250,000"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="entry-date" className="text-xs font-medium text-muted-foreground">
            تاریخ
          </label>
          <JalaliDatePicker value={date} onChange={setDate} />
        </div>
      </div>

      {/* شرح */}
      <div className="mt-3 grid gap-1.5">
        <label htmlFor="entry-desc" className="text-xs font-medium text-muted-foreground">
          شرح (اختیاری)
        </label>
        <Input
          id="entry-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="مثلاً: قرض، فروش گوشی، قسط وام و..."
          maxLength={300}
        />
      </div>

      <Button type="submit" className="mt-4 w-full" disabled={rawAmount <= 0 || saving}>
        {editing ? (
          <>
            <Save className="h-4 w-4" />
            ذخیره تغییرات
          </>
        ) : (
          <>
            <Pencil className="h-4 w-4" />
            ثبت تراکنش
          </>
        )}
      </Button>
    </form>
  );
}
