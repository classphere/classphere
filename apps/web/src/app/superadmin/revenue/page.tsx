"use client";

import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiMoneyDollarCircleLine, RiArrowRightUpLine, RiBarChartBoxLine, RiFileList3Line, RiCheckLine, RiDownloadCloud2Line } from "@remixicon/react";

const mockTransactions = [
  { id: "TXN-001", institute: "Aakash Institute (Delhi)", amount: "$299.00", plan: "Pro", date: "01 Jun 2026", status: "Success" },
  { id: "TXN-002", institute: "Allen Career Institute", amount: "$599.00", plan: "Enterprise", date: "01 Jun 2026", status: "Success" },
  { id: "TXN-003", institute: "Vibrant Academy", amount: "$99.00", plan: "Starter", date: "28 May 2026", status: "Success" },
  { id: "TXN-004", institute: "Future Point Classes", amount: "$99.00", plan: "Starter", date: "25 May 2026", status: "Failed" },
];

export default function RevenuePage() {
  return (
    <>
      <Navbar title="Revenue & Subscriptions" subtitle="Platform monetization, active plans, and billing history." />
      <main className="mx-auto w-full max-w-[1560px] flex flex-col items-center pb-12 pt-6 gap-6 px-6 bg-transparent">
        
        {/* ── KPI Cards (Full Width) ── */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex justify-between items-end w-full px-2">
            <h3 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
              Financial Overview
            </h3>
          </div>
          
          <MetricGrid cols={4} className="mt-2">
            {[
              { label: "Monthly Recurring Rev", value: "$124,500", sub: "+12%", subLabel: "vs last month", icon: <RiMoneyDollarCircleLine size={20} /> },
              { label: "ARPU", value: "$296.42", sub: "+$14", subLabel: "per active institute", icon: <RiBarChartBoxLine size={20} /> },
              { label: "Churn Rate", value: "1.2%", sub: "-0.2%", subLabel: "vs last month", icon: <RiFileList3Line size={20} /> },
              { label: "Net Revenue (YTD)", value: "$1.4M", sub: "On Track", subLabel: "Jan 1 - Present", icon: <RiMoneyDollarCircleLine size={20} /> },
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
          title="Recent Transactions"
          headerRight={
            <button className="flex flex-row items-center gap-2 h-10 px-4 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 hover:bg-s-stroke2/30 transition-colors active:scale-95">
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
            {mockTransactions.map((txn, i) => (
              <div key={txn.id} className="group/item relative flex flex-col md:flex-row md:items-center w-full p-4 md:px-6 gap-4 md:gap-0 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer">
                
                {/* ID */}
                <div className="w-full md:w-[120px] font-sans text-[15px] text-t-secondary">
                  {txn.id}
                </div>
                
                {/* Institute */}
                <div className="w-full md:w-[250px] font-sans text-[15px] font-semibold text-t-primary">
                  {txn.institute}
                </div>
                
                {/* Plan */}
                <div className="w-full md:w-[120px]">
                  <div className={`inline-flex items-center px-3 py-1 rounded-[10px] border ${
                    txn.plan === "Enterprise" ? "bg-[rgba(143,91,255,0.05)] border-s-stroke2/40 text-[#8F5BFF]" :
                    txn.plan === "Pro" ? "bg-[rgba(42,133,255,0.05)] border-s-stroke2/40 text-primary-01" :
                    "bg-b-surface1 border-s-stroke2/40 text-t-secondary"
                  }`}>
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider">{txn.plan}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="w-full md:w-[120px] font-sans text-[15px] font-bold text-t-primary">
                  {txn.amount}
                </div>

                {/* Date */}
                <div className="w-full md:w-[150px] font-sans text-[14px] text-t-secondary">
                  {txn.date}
                </div>

                {/* Status */}
                <div className="w-full md:w-[100px] text-right flex md:justify-end">
                  <div className={`inline-flex items-center px-3 py-1 rounded-[10px] border ${
                    txn.status === "Success" ? "bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02" :
                    "bg-[rgba(239,68,68,0.05)] border-s-stroke2/40 text-primary-03"
                  }`}>
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider">{txn.status}</span>
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
