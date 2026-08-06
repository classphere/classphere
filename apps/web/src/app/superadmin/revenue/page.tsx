"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiMoneyDollarCircleLine, RiArrowRightUpLine, RiBarChartBoxLine, RiFileList3Line, RiCheckLine, RiDownloadCloud2Line } from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/lib/hooks/useApiQuery";

export default function RevenuePage() {
  const { session } = useAuth();

  const { data: transactions = [] as any[], isPending: txnLoading } = useApiQuery<any[]>("/api/v1/superadmin/transactions");
  const { data: stats, isPending: statsLoading } = useApiQuery<any>("/api/v1/superadmin/stats");
  const loading = txnLoading || statsLoading;

  // Format currency
  const fmtMoney = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <>
      <Navbar title="Trials & Future Billing" subtitle="Billing is intentionally disabled while the platform operates on free trials." />
      <main className="mx-auto w-full max-w-[1560px] flex flex-col items-center pb-12 pt-6 gap-3 px-6 bg-transparent">
        
        {/* ── KPI Cards (Full Width) ── */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex justify-between items-end w-full px-2">
            <h3 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
              Financial Overview
            </h3>
          </div>
          
          <MetricGrid cols={4} className="mt-2">
            {[
              { label: "Active Trials", value: String(stats?.activeTrials ?? 0), sub: "Live", subLabel: "currently entitled", icon: <RiFileList3Line size={20} /> },
              { label: "Billing", value: "Disabled", sub: "Planned", subLabel: "no charges or invoices", icon: <RiMoneyDollarCircleLine size={20} /> },
              { label: "Revenue Reporting", value: "Unavailable", sub: "Planned", subLabel: "requires payment integration", icon: <RiBarChartBoxLine size={20} /> },
              { label: "Trial Access", value: "Enforced", sub: "Live", subLabel: "expired tenants are blocked", icon: <RiMoneyDollarCircleLine size={20} /> },
            ].map((kpi, i) => (
              <MetricCard
                key={i}
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                badge={kpi.sub}
                badgeLabel={kpi.subLabel}
              />
            ))}
          </MetricGrid>
        
        </div>

        {/* ── Recent Transactions ── */}
        <SectionCard 
          title="Billing Activity"
          headerRight={
            <button disabled className="flex flex-row items-center gap-2 h-10 px-4 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 opacity-50 cursor-not-allowed">
              <RiDownloadCloud2Line size={18} className="text-t-secondary" />
              <span className="font-sans text-[14px] font-semibold text-t-primary">Export CSV</span>
            </button>
          }
        >
          <div className="flex flex-col gap-3 mt-4">
            
            {/* Header row (hidden on mobile, visible md+) */}
            <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
              <div className="w-[120px]">TXN ID</div>
              <div className="w-[250px]">Institute</div>
              <div className="w-[120px]">Plan</div>
              <div className="w-[120px]">Amount</div>
              <div className="w-[150px]">Date</div>
              <div className="w-[100px] text-right">Status</div>
            </div>

            {/* Rows */}
            {transactions.length === 0 && !loading && (
              <div className="py-10 text-center text-t-secondary font-sans text-sm">
              Billing is disabled. Transactions and CSV export will become available after the payment integration is enabled.
              </div>
            )}
            {transactions.map((txn, i) => (
              <div key={txn.id} className="group/item relative flex flex-row items-center w-full p-2.5 sm:p-3 gap-3 sm:gap-4 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[64px] sm:h-[68px]">
                
                {/* ID & Institute */}
                <div className="flex flex-col justify-center flex-1 min-w-0 md:flex-row md:items-center md:gap-4 md:flex-none md:w-[370px]">
                  <div className="font-sans text-[12px] sm:text-[15px] text-t-secondary truncate md:w-[120px]">
                    {txn.razorpay_invoice_id || txn.id.split('-')[0]}
                  </div>
                  <div className="font-sans text-[14px] sm:text-[15px] font-semibold text-t-primary truncate md:w-[250px]">
                    {txn.institute?.name || "Unknown"}
                  </div>
                </div>
                
                {/* Plan (Hidden on mobile) */}
                <div className="hidden md:block md:w-[120px]">
                  <span className={`inline-flex items-center px-3 py-1 rounded-[10px] text-[11px] font-bold uppercase tracking-wider border ${
                    txn.institute?.plan === "enterprise" ? "bg-[rgba(94,92,230,0.05)] border-[#5E5CE6]/20 text-[#5E5CE6]" :
                    txn.institute?.plan === "active" ? "bg-[rgba(42,133,255,0.05)] border-s-stroke2/40 text-primary-01" :
                    "bg-[rgba(0,166,86,0.05)] border-[rgba(0,166,86,0.2)] text-primary-02"
                  }`}>
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider">{txn.institute?.plan || "free"}</span>
                  </span>
                </div>

                {/* Amount & Date */}
                <div className="flex flex-col md:flex-row md:items-center justify-center gap-0.5 md:gap-4 md:w-[270px]">
                  <div className="font-sans text-[14px] sm:text-[15px] font-bold text-t-primary md:w-[120px] text-right md:text-left">
                    {fmtMoney(txn.amount_paid)}
                  </div>
                  <div className="font-sans text-[11px] sm:text-[14px] text-t-secondary truncate md:w-[150px] text-right md:text-left">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Status */}
                <div className="w-[60px] md:w-[100px] text-right flex justify-end shrink-0">
                  <div className={`inline-flex items-center px-2 py-1 sm:px-3 rounded-[10px] border ${
                    txn.status === "paid" ? "bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02" :
                    "bg-[rgba(239,68,68,0.05)] border-s-stroke2/40 text-primary-03"
                  }`}>
                    <span className="font-sans text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{txn.status}</span>
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        </SectionCard>

      </main>
    </>
  );
}
