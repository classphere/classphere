import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

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
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased" style={{ display: "flex", justifyContent: "center", backgroundColor: "var(--n-20)" }}>
        <div style={{ display: "flex", width: "100%", maxWidth: 1440, minHeight: "100vh", position: "relative", backgroundColor: "var(--bg-default)", boxShadow: "0 0 40px rgba(0,0,0,0.05)" }}>
          <Sidebar />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
