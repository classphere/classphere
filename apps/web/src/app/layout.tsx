import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExamPrep — Dashboard",
  description: "B2B Exam Preparation Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-theme="light">
      <body className="min-h-screen bg-b-surface1 text-t-primary antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
