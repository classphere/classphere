"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  RiCheckFill, 
  RiDownload2Line, 
  RiCloseLine, 
  RiSearchLine, 
  RiNotification3Line, 
  RiMailLine,
  RiArrowRightLine
} from "@remixicon/react";

const mockInvoices = [
  { id: "INV-2023-001", date: "01 Jun 2026", amount: "$299.00", status: "Paid" },
  { id: "INV-2023-002", date: "01 May 2026", amount: "$299.00", status: "Paid" },
  { id: "INV-2023-003", date: "01 Apr 2026", amount: "$299.00", status: "Paid" },
];

export default function BillingPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <>
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">
        
        {/* ── Top Navigation Row (Figma Style) ── */}
        <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
          {/* Title */}
          <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
            Billing & Subscription
          </h1>

          {/* Navigation Items (Right Side) */}
          <div className="flex flex-row items-center gap-3">
            {/* Search Box */}
            <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] px-3 py-2 w-[315px] h-12 gap-2 shadow-xs">
              <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary" />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
              />
            </div>

            {/* Bell Button */}
            <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center relative shrink-0 cursor-pointer">
              <RiNotification3Line size={20} />
              <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
            </button>

            {/* Mail Button */}
            <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center shrink-0 cursor-pointer">
              <RiMailLine size={20} />
            </button>

            {/* Avatar Profile */}
            <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2 bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
              <div className="size-9 rounded-full bg-b-depth text-t-primary flex items-center justify-center text-xs font-bold">
                AA
              </div>
            </div>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="group relative w-full bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] overflow-hidden mt-4 transition-all duration-300">
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center p-8 bg-gradient-to-br from-t-primary to-[#2C2C2C] dark:from-b-surface2 dark:to-b-surface1 border border-transparent dark:border-s-stroke2/40">
            
            <div className="flex flex-col gap-2">
              <div className="w-max px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/90 border border-white/10 mb-2">
                Pro Plan
              </div>
              <h2 className="font-sans font-semibold text-[28px] text-white m-0">Institute Pro</h2>
              <p className="text-sm text-white/70 m-0">Unlimited students, advanced analytics, custom branding.</p>
            </div>

            <div className="flex flex-col items-end gap-3 mt-6 md:mt-0">
              <div className="flex items-baseline gap-1">
                <span className="font-sans font-bold text-[36px] text-white leading-none">$299</span>
                <span className="text-white/70 text-sm">/mo</span>
              </div>
              <p className="text-xs text-white/60 m-0">Renews on Jul 1, 2026</p>
              <button 
                className="btn bg-white text-t-primary hover:bg-b-surface1 h-10 px-5 rounded-[10px] text-sm font-semibold mt-2 border-none cursor-pointer"
                onClick={() => setShowUpgradeModal(true)}
              >
                Upgrade Plan
              </button>
            </div>
            
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
          
          {/* Usage This Month */}
          <div className="group relative flex flex-col justify-between p-6 md:p-8 gap-6 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-velora-light w-full overflow-hidden transition-all duration-300">
            
            <div className="relative z-10 flex flex-col gap-1">
              <h3 className="font-sans font-bold text-[20px] text-t-primary dark:text-t-primary">Usage This Month</h3>
              <p className="text-xs text-t-secondary dark:text-t-tertiary">Track your current billing cycle limits</p>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6 mt-2">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-t-primary dark:text-t-primary">Active Students</span>
                  <span className="text-xs font-semibold text-t-secondary dark:text-t-tertiary">1,204 / Unlimited</span>
                </div>
                <div className="w-full h-2 bg-b-surface1 dark:bg-b-surface1 rounded-full overflow-hidden border border-s-stroke2/20">
                  <div className="h-full bg-primary-01 rounded-full" style={{ width: "60%" }} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-t-primary dark:text-t-primary">Storage Used</span>
                  <span className="text-xs font-semibold text-t-secondary dark:text-t-tertiary">45GB / 100GB</span>
                </div>
                <div className="w-full h-2 bg-b-surface1 dark:bg-b-surface1 rounded-full overflow-hidden border border-s-stroke2/20">
                  <div className="h-full bg-primary-05 rounded-full" style={{ width: "45%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="group relative flex flex-col justify-between p-6 md:p-8 gap-6 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-velora-light w-full overflow-hidden transition-all duration-300">
            
            <div className="relative z-10 flex flex-col gap-1">
              <h3 className="font-sans font-bold text-[20px] text-t-primary dark:text-t-primary">Payment Method</h3>
              <p className="text-xs text-t-secondary dark:text-t-tertiary">Manage your default billing card</p>
            </div>

            <div className="relative z-10 flex flex-row items-center gap-4 p-4 rounded-[10px] bg-b-surface1 dark:bg-b-surface1/40 border border-s-stroke2 dark:border-s-stroke2/40 mt-2">
              <div className="w-14 h-10 flex items-center justify-center bg-white dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 rounded-[10px] shrink-0">
                <span className="text-[10px] font-bold text-t-primary dark:text-t-primary">VISA</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-sm font-semibold text-t-primary dark:text-t-primary tracking-widest">•••• •••• •••• 4242</span>
                <span className="text-xs text-t-secondary dark:text-t-tertiary mt-0.5">Expires 12/28</span>
              </div>

              <button className="btn btn-outline btn-sm font-sans shrink-0 cursor-pointer">
                Edit
              </button>
            </div>
          </div>

        </div>

        {/* Invoice History */}
        <div className="group relative flex flex-col p-6 md:p-8 gap-6 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-velora-light w-full min-w-0 overflow-hidden select-none transition-all duration-300">
          
          <div className="relative z-10 flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
            <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
              Invoice History
            </h4>
            <Link 
              href="/institute/billing" 
              className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
            >
              <span>View All</span>
              <RiArrowRightLine size={16} />
            </Link>
          </div>

          <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
            {mockInvoices.map((invoice, index) => (
              <div 
                key={invoice.id}
                className="group/item relative flex flex-row items-center justify-between p-4 gap-8 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all h-[96px] cursor-pointer"
              >
                {/* Left: ID & Date */}
                <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                  <div className="flex w-16 h-16 items-center justify-center rounded-[10px] bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 dark:border-s-stroke2/20 shrink-0 text-t-secondary dark:text-t-tertiary font-bold text-lg">
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                      {invoice.id}
                    </span>
                    <span className="text-xs text-t-secondary dark:text-t-tertiary mt-0.5">
                      Issued {invoice.date}
                    </span>
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex flex-row items-center gap-8 shrink-0">
                  <div className="flex flex-col items-end justify-center min-w-[90px]">
                    <span className="text-[10px] font-sans font-bold text-t-secondary dark:text-t-tertiary uppercase tracking-wider">
                      Amount
                    </span>
                    <span className="text-[16px] font-sans font-bold text-t-primary dark:text-t-primary mt-0.5">
                      {invoice.amount}
                    </span>
                  </div>

                  <div className="flex flex-col items-end justify-center min-w-[90px]">
                    <span className="text-[10px] font-sans font-bold text-t-secondary dark:text-t-tertiary uppercase tracking-wider">
                      Status
                    </span>
                    <div className="flex flex-row justify-center items-center px-2 py-[2px] mt-0.5 rounded-[10px] border-[1.5px] text-[10px] font-bold tracking-[0.004em] uppercase bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02">
                      {invoice.status}
                    </div>
                  </div>

                  <div className="min-w-[50px] flex justify-end">
                    <button className="btn btn-outline w-10 h-10 !px-0 rounded-[10px] flex items-center justify-center cursor-pointer text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary">
                      <RiDownload2Line size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-shade-01/40 dark:bg-shade-01/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="group relative w-full max-w-[600px] rounded-[10px] bg-b-surface2 dark:bg-b-surface2 shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.18)] border border-s-stroke2/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="relative z-10 flex flex-col p-8">
                
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-sans font-bold text-[24px] text-t-primary dark:text-t-primary m-0">Upgrade Subscription</h2>
                  <button 
                    className="btn btn-outline w-10 h-10 !px-0 rounded-[10px] flex items-center justify-center cursor-pointer text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary" 
                    onClick={() => setShowUpgradeModal(false)}
                  >
                    <RiCloseLine size={20} />
                  </button>
                </div>
                
                <p className="text-sm text-t-secondary dark:text-t-tertiary mb-6">
                  You are currently on the <strong className="text-t-primary dark:text-t-primary font-semibold">Pro Plan</strong>. Select a tier below to request an upgrade from the Super Admin.
                </p>
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-row justify-between items-center p-6 border-2 border-primary-02/20 bg-primary-02/5 rounded-[10px]">
                    <div className="flex flex-col">
                      <h3 className="font-sans font-bold text-[18px] text-t-primary dark:text-t-primary">Enterprise Plan</h3>
                      <ul className="flex flex-col gap-1.5 mt-3 text-xs text-t-secondary dark:text-t-tertiary">
                        <li className="flex items-center gap-2"><RiCheckFill size={14} className="text-primary-02" /> Unlimited Students</li>
                        <li className="flex items-center gap-2"><RiCheckFill size={14} className="text-primary-02" /> Custom App Branding (White-label)</li>
                        <li className="flex items-center gap-2"><RiCheckFill size={14} className="text-primary-02" /> 24/7 Dedicated Support</li>
                      </ul>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="font-sans font-bold text-[24px] text-t-primary dark:text-t-primary">Custom</div>
                      <button 
                        className="btn btn-primary h-10 px-5 rounded-[10px] text-xs font-semibold cursor-pointer" 
                        onClick={() => setShowUpgradeModal(false)}
                      >
                        Contact Sales
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
