import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth-context";
import { TenantProvider } from "@/lib/tenant-context";
import { QueryProvider } from "@/lib/query-provider";
import NativePlatformSetup from "@/components/layout/NativePlatformSetup";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Classphere — Dashboard",
  description: "Classphere B2B LMS",
  icons: {
    icon: [{ url: "/logoC.png?v=1", type: "image/png" }],
  },
};

// Separate viewport export (Next.js 14+ requirement).
// viewportFit=cover is critical — without it env(safe-area-inset-*) returns 0
// and content bleeds behind the status/navigation bars in Capacitor.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-theme="light">
      <body className="min-h-screen bg-b-surface1 text-t-primary antialiased">
        {/* Detects Capacitor and adds .native-platform to <body> */}
        <NativePlatformSetup />
        <QueryProvider>
          <TenantProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </TenantProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
