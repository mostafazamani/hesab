import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import logo from "./logo.svg";

export const metadata: Metadata = {
  title: "دفتر حساب | حساب و کتاب شخصی",
  description:
    "مدیریت حساب و کتاب با دوستان و آشنایان: ثبت بدهکار و بستانکار، جمع هر ستون، محاسبه اختلاف و خروجی اکسل",
  icons: {
    icon: logo.src,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
