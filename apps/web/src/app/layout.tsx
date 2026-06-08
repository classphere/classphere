import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExamPrep — AI-Powered JEE & NEET Test Platform",
  description:
    "Take customized tests, get AI-powered analysis, and track your rank among thousands of JEE and NEET aspirants. The smartest way to prepare.",
  keywords: ["JEE", "NEET", "exam preparation", "AI analysis", "test platform", "mock test"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
