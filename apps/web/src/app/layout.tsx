import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth-context";
import { TenantProvider } from "@/lib/tenant-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Classphere — Dashboard",
  description: "Classphere B2B LMS",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-theme="light">
      <body className="min-h-screen bg-b-surface1 text-t-primary antialiased">
        <TenantProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
