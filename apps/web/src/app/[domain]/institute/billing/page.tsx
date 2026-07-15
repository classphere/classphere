"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { 
  RiCheckFill, 
  RiDownload2Line, 
  RiCloseLine, 
  RiSearchLine, 
  RiNotification3Line, 
  RiMailLine,
  RiArrowRightLine,
  RiTimeLine
} from "@remixicon/react";
import { PremiumSectionCard } from "@/components/premium-ui";

export default function BillingPage() {
  const { session } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    const fetchSub = async () => {
      try {
        const res = await apiClient.get("/api/v1/institutes/me/subscription", session.access_token);
        if (res.success) setSubscription(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchSub();
  }, [session?.access_token]);

  return (
    <>
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">
        
        {/* ── Top Navigation Row (Figma Style) ── */}
        <div className="flex flex-col md:flex-row justify-start md:justify-between items-start md:items-center w-full h-auto md:h-12 gap-4 md:gap-6">
          {/* Title */}
          <h1 className="font-sans font-semibold text-[24px] md:text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
            Billing & Subscription
          </h1>

          {/* Navigation Items (Right Side) */}
          <div className="flex flex-row flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] px-3 py-2 flex-1 md:flex-none md:w-[315px] h-12 gap-2 shadow-xs">
              <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary shrink-0" />
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

        {/* Current Plan Card (Trial Mode) */}
        {!loading && subscription ? (
          <div className="group relative w-full bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] overflow-hidden mt-4 transition-all duration-300">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center p-8 bg-gradient-to-br from-[#4F46E5] to-[#312E81] border border-transparent">
              
              <div className="flex flex-col gap-2 text-white">
                <div className="w-max px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white/90 border border-white/20 mb-2 flex items-center gap-1">
                  <RiTimeLine size={14} /> Trial Active
                </div>
                <h2 className="font-sans font-semibold text-[28px] m-0 capitalize">{subscription.plan_tier} Plan</h2>
                <p className="text-sm text-white/80 m-0">You are currently enjoying full access during your trial period.</p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-3 mt-6 md:mt-0 w-full md:w-auto border-t md:border-none border-white/20 pt-4 md:pt-0">
                <div className="flex items-baseline gap-1">
                  <span className="font-sans font-bold text-[36px] text-white leading-none">₹0</span>
                  <span className="text-white/70 text-sm">/mo</span>
                </div>
                <p className="text-xs text-white/80 m-0">Trial ends on {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                <button 
                  className="btn bg-white text-[#4F46E5] hover:bg-white/90 h-10 px-5 rounded-[10px] text-sm font-semibold mt-2 border-none cursor-pointer shadow-md"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  Upgrade Plan
                </button>
              </div>
              
            </div>
          </div>
        ) : loading ? (
          <div className="w-full h-[200px] animate-pulse bg-s-stroke2/50 rounded-[24px] mt-4"></div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
          
          {/* Usage This Month */}
          <PremiumSectionCard 
            title="Usage This Month" 
            subtitle="Track your current billing cycle limits" 
            className="w-full"
          >
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
          </PremiumSectionCard>

          {/* Payment Method */}
          <PremiumSectionCard 
            title="Payment Method" 
            subtitle="Manage your default billing card" 
            className="w-full"
          >
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
          </PremiumSectionCard>

        </div>

        {/* Invoice History */}
        <PremiumSectionCard 
          title="Invoice History" 
          headerRight={
            <Link 
              href="/institute/billing" 
              className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
            >
              <span>View All</span>
              <RiArrowRightLine size={16} />
            </Link>
          }
          className="w-full"
        >
          <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
            {([] as any[]).map((invoice, index) => (
              <div 
                key={invoice.id}
                className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[76px] sm:h-[88px] cursor-pointer w-full overflow-hidden"
              >
                {/* Left: ID & Date */}
                <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                  <div className="flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold text-sm sm:text-lg">
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="font-sans font-semibold text-[14px] sm:text-[16px] text-t-primary truncate">
                      {invoice.id}
                    </span>
                    <span className="text-[11px] sm:text-xs text-t-secondary mt-0.5 truncate">
                      Issued {invoice.date}
                    </span>
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex flex-row items-center gap-2 sm:gap-8 shrink-0">
                  <div className="flex flex-col items-end justify-center">
                    <span className="hidden sm:inline text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                      Amount
                    </span>
                    <span className="text-[13px] sm:text-[16px] font-sans font-bold text-t-primary sm:mt-0.5">
                      {invoice.amount}
                    </span>
                  </div>

                  <div className="flex flex-col items-end justify-center">
                    <span className="hidden sm:inline text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                      Status
                    </span>
                    <div className="flex flex-row justify-center items-center px-2 py-0.5 sm:mt-0.5 rounded-[10px] border text-[9px] sm:text-[10px] font-bold uppercase bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02">
                      {invoice.status}
                    </div>
                  </div>

                  <div className="shrink-0 flex justify-end pl-1 sm:pl-0">
                    <button className="btn btn-outline w-8 h-8 sm:w-10 sm:h-10 !px-0 rounded-[10px] flex items-center justify-center text-t-secondary hover:text-t-primary">
                      <RiDownload2Line size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PremiumSectionCard>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-b-surface1 dark:bg-[#1a1a1a] rounded-[24px] max-w-md w-full p-8 relative border border-s-stroke2/50 shadow-2xl">
              <button 
                className="absolute top-4 right-4 p-2 text-t-secondary hover:text-t-primary rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setShowUpgradeModal(false)}
              >
                <RiCloseLine size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 bg-primary-05/10 rounded-full flex items-center justify-center mb-6">
                  <RiNotification3Line size={32} className="text-primary-05" />
                </div>
                
                <h3 className="font-sans font-bold text-2xl text-t-primary mb-3">
                  Payment Integration Coming Soon
                </h3>
                
                <p className="text-t-secondary text-[15px] leading-relaxed mb-8 px-2">
                  We are currently setting up our GST and billing infrastructure. 
                  Enjoy your 2-month free trial in the meantime! We will notify you when you can upgrade to a paid tier.
                </p>

                <button 
                  className="btn btn-primary w-full h-12 rounded-[12px] text-[15px] font-semibold"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Continue Free Trial
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
