"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  jalaliMonthLength,
  normalizeJalaliString,
  parseJalaliString,
  todayJalali,
  weekdayIndex,
  type JDate,
} from "@/lib/jalali";
import { cn } from "@/lib/utils";

interface JalaliDatePickerProps {
  value: string; // "1404/08/18"
  onChange: (value: string) => void;
  className?: string;
}

export function JalaliDatePicker({ value, onChange, className }: JalaliDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(value);
  const today = React.useMemo(() => todayJalali(), []);
  const parsed = parseJalaliString(value);
  const [view, setView] = React.useState<JDate>(parsed ?? today);

  // وقتی مقدار بیرونی عوض شد، متن و نمای تقویم هماهنگ شود
  React.useEffect(() => {
    setText(value);
    const p = parseJalaliString(value);
    if (p) setView(p);
  }, [value]);

  const daysInMonth = jalaliMonthLength(view.jy, view.jm);
  const leadingBlanks = weekdayIndex(view.jy, view.jm, 1);

  const shiftMonth = (delta: number) => {
    setView((v) => {
      let jm = v.jm + delta;
      let jy = v.jy;
      if (jm > 12) {
        jm = 1;
        jy += 1;
      } else if (jm < 1) {
        jm = 12;
        jy -= 1;
      }
      return { jy, jm, jd: Math.min(v.jd, jalaliMonthLength(jy, jm)) };
    });
  };

  const commitText = (raw: string) => {
    const normalized = normalizeJalaliString(raw);
    if (normalized) {
      onChange(normalized);
      setText(normalized);
    } else {
      // بازگشت به مقدار معتبر قبلی
      setText(value);
    }
  };

  const selectDay = (jd: number) => {
    const s = `${view.jy}/${String(view.jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
    onChange(s);
    setText(s);
    setOpen(false);
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commitText(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitText(text);
          }
        }}
        placeholder="۱۴۰۴/۰۸/۱۸"
        inputMode="numeric"
        className="pl-10"
        aria-label="تاریخ تراکنش"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-1 h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="نمایش تقویم"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start" sideOffset={4}>
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => shiftMonth(1)}
              aria-label="ماه بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold">
              {JALALI_MONTHS[view.jm - 1]} {view.jy}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => shiftMonth(-1)}
              aria-label="ماه قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {JALALI_WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                parsed && parsed.jy === view.jy && parsed.jm === view.jm && parsed.jd === day;
              const isToday =
                today.jy === view.jy && today.jm === view.jm && today.jd === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "h-8 rounded-md text-sm transition-colors hover:bg-accent",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !isSelected && isToday && "ring-1 ring-primary text-primary font-semibold",
                  )}
                >
                  {day.toLocaleString("fa-IR", { useGrouping: false })}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const s = `${today.jy}/${String(today.jm).padStart(2, "0")}/${String(today.jd).padStart(2, "0")}`;
                onChange(s);
                setText(s);
                setView(today);
                setOpen(false);
              }}
            >
              امروز
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
