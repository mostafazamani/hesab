"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContactDialogProps {
  open: boolean;
  editing: { id: number; name: string; note: string | null } | null; // null یعنی حالت افزودن
  onClose: () => void;
  onSubmit: (name: string, note: string) => Promise<boolean>;
}

export function ContactDialog({ open, editing, onClose, onSubmit }: ContactDialogProps) {
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setNote(editing?.note ?? "");
    }
  }, [open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const ok = await onSubmit(name, note);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش طرف حساب" : "طرف حساب جدید"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "نام یا یادداشت این طرف حساب را ویرایش کنید."
                : "نام شخصی که با او حساب و کتاب دارید را وارد کنید."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-name">نام</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: علی، فروشگاه برادران، مایکروفران..."
                maxLength={80}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-note">یادداشت (اختیاری)</Label>
              <Textarea
                id="contact-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: همکار قدیمی، حساب قرض فروشگاه و..."
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "در حال ذخیره..." : editing ? "ذخیره تغییرات" : "افزودن"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
