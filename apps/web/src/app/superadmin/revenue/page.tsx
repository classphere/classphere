"use client";

import Navbar from "@/components/layout/Navbar";
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
        <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
          <div className="box-hover" />
          
          <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
            <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
              Financial Overview
            </h3>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg">
            
            {[
              { label: "Monthly Recurring Rev", value: "$124,500", sub: "+12%", subLabel: "vs last month", icon: <RiMoneyDollarCircleLine size={20} /> },
              { label: "ARPU", value: "$296.42", sub: "+$14", subLabel: "per active institute", icon: <RiBarChartBoxLine size={20} /> },
              { label: "Churn Rate", value: "1.2%", sub: "-0.2%", subLabel: "vs last month", icon: <RiFileList3Line size={20} /> },
              { label: "Net Revenue (YTD)", value: "$1.4M", sub: "On Track", subLabel: "Jan 1 - Present", icon: <RiMoneyDollarCircleLine size={20} /> },
            ].map((kpi, i) => (
              <div key={i} className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
                <div className="flex flex-row items-center gap-3 w-full mb-1">
                  <span className="text-[#101010] dark:text-t-primary">{kpi.icon}</span>
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                    {kpi.label}
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4 w-full mt-1">
                  <div className="font-sans text-[42px] lg:text-[48px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                    {kpi.value}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                      <span className="text-[#00A656] text-[12px] font-semibold leading-none">{kpi.sub}</span>
                    </div>
                    <span className="text-[12px] font-sans text-[#7B7B7B] whitespace-nowrap">
                      {kpi.subLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Subscription Tiers ── */}
        <div className="w-full flex flex-col items-start gap-6 mt-4">
          <div className="flex flex-col items-start gap-1 w-full px-2">
            <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
              Active Subscription Tiers
            </h3>
            <span className="font-sans text-[14px] text-[#7B7B7B]">Manage pricing and feature access for all platform tenants</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            
            {/* Starter Plan */}
            <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border-t-[6px] border-t-[#7B7B7B] border border-s-stroke2/40 w-full">
              <div className="box-hover" />
              <div className="relative z-10 flex flex-col items-start w-full">
                <div className="flex flex-row justify-between items-center w-full mb-6">
                  <h3 className="font-sans text-[22px] font-semibold text-[#101010] dark:text-t-primary">Starter Plan</h3>
                  <div className="flex items-center px-3 py-1 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40">
                    <span className="font-sans text-[13px] font-semibold text-[#7B7B7B]">14 Institutes</span>
                  </div>
                </div>
                
                <div className="flex flex-row items-end gap-1 mb-8">
                  <span className="font-sans text-[48px] font-bold text-[#101010] dark:text-t-primary leading-none">$99</span>
                  <span className="font-sans text-[16px] font-medium text-[#7B7B7B] mb-2">/mo</span>
                </div>
                
                <div className="flex flex-col gap-4 w-full mb-8">
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#7B7B7B] dark:text-t-secondary">Up to 500 Students</span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#7B7B7B] dark:text-t-secondary">Basic Reporting</span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#7B7B7B] dark:text-t-secondary">Standard Question Bank</span>
                  </div>
                </div>
                
                <button className="mt-auto w-full py-3 rounded-lg border border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors font-sans text-[15px] font-semibold text-[#101010] dark:text-t-primary">
                  Edit Tier
                </button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border-t-[6px] border-t-[#2A85FF] border border-s-stroke2/40 w-full scale-[1.02] z-10 shadow-xl">
              <div className="box-hover" />
              <div className="relative z-10 flex flex-col items-start w-full">
                <div className="flex flex-row justify-between items-center w-full mb-6">
                  <h3 className="font-sans text-[22px] font-semibold text-[#101010] dark:text-t-primary">Pro Plan</h3>
                  <div className="flex items-center px-3 py-1 rounded-lg bg-[rgba(42,133,255,0.1)] border border-[rgba(42,133,255,0.2)]">
                    <span className="font-sans text-[13px] font-semibold text-[#2A85FF]">22 Institutes</span>
                  </div>
                </div>
                
                <div className="flex flex-row items-end gap-1 mb-8">
                  <span className="font-sans text-[48px] font-bold text-[#101010] dark:text-t-primary leading-none">$299</span>
                  <span className="font-sans text-[16px] font-medium text-[#7B7B7B] mb-2">/mo</span>
                </div>
                
                <div className="flex flex-col gap-4 w-full mb-8">
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#7B7B7B] dark:text-t-secondary">Up to 5,000 Students</span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#101010] dark:text-t-primary font-medium">Advanced Analytics</span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#101010] dark:text-t-primary font-medium">AI Analysis Features</span>
                  </div>
                </div>
                
                <button className="mt-auto w-full py-3 rounded-lg bg-[#101010] hover:bg-[#202020] dark:bg-[#FDFDFD] dark:hover:bg-[#EAEAEA] text-[#FDFDFD] dark:text-[#101010] transition-colors font-sans text-[15px] font-semibold">
                  Edit Tier
                </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border-t-[6px] border-t-[#8F5BFF] border border-s-stroke2/40 w-full">
              <div className="box-hover" />
              <div className="relative z-10 flex flex-col items-start w-full">
                <div className="flex flex-row justify-between items-center w-full mb-6">
                  <h3 className="font-sans text-[22px] font-semibold text-[#101010] dark:text-t-primary">Enterprise</h3>
                  <div className="flex items-center px-3 py-1 rounded-lg bg-[rgba(143,91,255,0.1)] border border-[rgba(143,91,255,0.2)]">
                    <span className="font-sans text-[13px] font-semibold text-[#8F5BFF]">6 Institutes</span>
                  </div>
                </div>
                
                <div className="flex flex-row items-end gap-1 mb-8">
                  <span className="font-sans text-[48px] font-bold text-[#101010] dark:text-t-primary leading-none">Custom</span>
                </div>
                
                <div className="flex flex-col gap-4 w-full mb-8">
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#7B7B7B] dark:text-t-secondary">Unlimited Students</span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#101010] dark:text-t-primary font-medium">Dedicated Account Manager</span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <RiCheckLine size={20} className="text-[#00A656]" />
                    <span className="font-sans text-[15px] text-[#101010] dark:text-t-primary font-medium">Custom Integrations</span>
                  </div>
                </div>
                
                <button className="mt-auto w-full py-3 rounded-lg border border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors font-sans text-[15px] font-semibold text-[#101010] dark:text-t-primary">
                  Edit Tier
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none mt-4">
          <div className="box-hover" />
          
          <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
            <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
              Recent Transactions
            </h3>
            <button className="flex flex-row items-center gap-2 px-4 py-2 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors">
              <RiDownloadCloud2Line size={18} className="text-[#7B7B7B]" />
              <span className="font-sans text-[14px] font-semibold text-[#101010] dark:text-t-primary">Export CSV</span>
            </button>
          </div>

          <div className="relative z-10 w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-s-stroke2/40">
                  <th className="py-4 px-4 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Transaction ID</th>
                  <th className="py-4 px-4 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Institute</th>
                  <th className="py-4 px-4 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Plan</th>
                  <th className="py-4 px-4 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Amount</th>
                  <th className="py-4 px-4 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Date</th>
                  <th className="py-4 px-4 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((txn, i) => (
                  <tr key={txn.id} className="border-b border-s-stroke2/20 hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/40 transition-colors">
                    <td className="py-4 px-4 font-sans text-[15px] text-[#7B7B7B]">{txn.id}</td>
                    <td className="py-4 px-4 font-sans text-[15px] font-semibold text-[#101010] dark:text-t-primary">{txn.institute}</td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border ${
                        txn.plan === "Enterprise" ? "bg-[rgba(143,91,255,0.05)] border-[rgba(143,91,255,0.2)] text-[#8F5BFF]" :
                        txn.plan === "Pro" ? "bg-[rgba(42,133,255,0.05)] border-[rgba(42,133,255,0.2)] text-[#2A85FF]" :
                        "bg-[#F9F9F9] dark:bg-b-surface1 border-s-stroke2/40 text-[#7B7B7B]"
                      }`}>
                        <span className="font-sans text-[13px] font-semibold">{txn.plan}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-sans text-[15px] font-bold text-[#101010] dark:text-t-primary">{txn.amount}</td>
                    <td className="py-4 px-4 font-sans text-[15px] text-[#7B7B7B]">{txn.date}</td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border ${
                        txn.status === "Success" ? "bg-[rgba(0,166,86,0.05)] border-[rgba(0,166,86,0.2)] text-[#00A656]" :
                        "bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.2)] text-[#EF4444]"
                      }`}>
                        <span className="font-sans text-[13px] font-semibold">{txn.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </main>
    </>
  );
}
