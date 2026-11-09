"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { normalizeAmountTyping } from "@/lib/money";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: string; // متن قالب‌بندی‌شده با جداکننده هزارگان
  onValueChange: (display: string, raw: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  id?: string;
  onBlur?: () => void;
}

export function AmountInput({
  value,
  onValueChange,
  placeholder,
  className,
  autoFocus,
  id,
  onBlur,
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const display = normalizeAmountTyping(e.target.value);
    const raw = display ? Number(display.replace(/,/g, "")) : 0;
    onValueChange(display, raw);
  };

  return (
    <Input
      id={id}
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      inputMode="decimal"
      className={cn("text-left", className)}
      autoFocus={autoFocus}
      dir="ltr"
    />
  );
}
