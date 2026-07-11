"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { PageWrapper } from "@/components/ui";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import {
  RiBarChartBoxLine,
  RiArrowRightUpLine,
  RiRulerLine,
  RiAlertFill,
  RiArrowDownSLine
} from "@remixicon/react";

import { ScorePerformanceWidget } from "@/components/dashboard/ScorePerformanceWidget";
import { PendingDPPsWidget } from "@/components/dashboard/PendingDPPsWidget";
import { RecentTestsWidget } from "@/components/dashboard/RecentTestsWidget";
import { AIRiskAlertWidget } from "@/components/dashboard/AIRiskAlertWidget";
import { ActionRequiredWidget } from "@/components/dashboard/ActionRequiredWidget";

const performanceDataJEE = [
  { name: "M1", Physics: 45, Chemistry: 55, Mathematics: 65, Overall: 165 },
  { name: "M2", Physics: 52, Chemistry: 75, Mathematics: 85, Overall: 212 },
  { name: "M3", Physics: 48, Chemistry: 60, Mathematics: 55, Overall: 163 },
  { name: "M4", Physics: 86, Chemistry: 76, Mathematics: 93, Overall: 255 },
  { name: "M5", Physics: 58, Chemistry: 70, Mathematics: 75, Overall: 203 },
  { name: "M6", Physics: 72, Chemistry: 48, Mathematics: 60, Overall: 180 },
  { name: "M7", Physics: 68, Chemistry: 83, Mathematics: 98, Overall: 249 }
];

const performanceDataNEET = [
  { name: "M1", Physics: 70, Chemistry: 80, Botany: 85, Zoology: 85, Overall: 320 },
  { name: "M2", Physics: 95, Chemistry: 105, Botany: 105, Zoology: 105, Overall: 410 },
  { name: "M3", Physics: 85, Chemistry: 95, Botany: 105, Zoology: 105, Overall: 390 },
  { name: "M4", Physics: 120, Chemistry: 130, Botany: 135, Zoology: 135, Overall: 520 },
  { name: "M5", Physics: 110, Chemistry: 120, Botany: 130, Zoology: 130, Overall: 490 },
  { name: "M6", Physics: 145, Chemistry: 155, Botany: 155, Zoology: 155, Overall: 610 },
  { name: "M7", Physics: 150, Chemistry: 160, Botany: 160, Zoology: 160, Overall: 630 }
];

export default function Dashboard() {
  const { user } = useAuth();
  const isNEET = user?.batch?.includes("NEET") ?? false;
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);
  const chartData = isNEET ? performanceDataNEET : performanceDataJEE;

  const getGreeting = () => {
    const hours = new Date().getHours();
    const firstName = (user?.name ?? "there").split(" ")[0];
    if (hours < 12) return `Good morning, ${firstName}`;
    if (hours < 17) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  };

  return (
    <>
      <Navbar title={getGreeting()} subtitle="Welcome back! Ready to level up your score?">
        <div className="relative mt-2">
          <Button 
            variant="secondary"
            onClick={() => setIsOverviewDropdownOpen(!isOverviewDropdownOpen)}
            className="!px-4 !py-2 text-[12px] h-9"
          >
            <span className="relative">This Week</span>
            <RiArrowDownSLine size={16} className="relative ml-1 text-[#525252] dark:text-t-secondary" />
          </Button>
          
          {isOverviewDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOverviewDropdownOpen(false)} />
              <ul className="absolute right-0 top-11 z-50 w-[140px] rounded-[16px] border border-black/5 dark:border-white/5 bg-[#FAFAFA] dark:bg-[#161616] p-1.5 shadow-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
                <li>
                  <button
                    onClick={() => setIsOverviewDropdownOpen(false)}
                    className="w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold bg-black/5 dark:bg-white/5 text-t-primary"
                  >
                    This Week
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsOverviewDropdownOpen(false)}
                    className="w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold bg-transparent text-[#838383] hover:bg-black/5 dark:hover:bg-white/5 hover:text-t-primary transition-colors"
                  >
                    Last Week
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </Navbar>
      
      <PageWrapper>
        
        <MetricGrid cols={4}>
          <MetricCard icon={<RiBarChartBoxLine size={18} />} label="Tests Taken" value={8} badge="+2" badgeLabel="this week" />
          <MetricCard icon={<RiArrowRightUpLine size={18} />} label="Accuracy Rate" value="71.2%" badge="+5.2%" badgeLabel="boost" />
          <MetricCard icon={<RiRulerLine size={18} />} label="Average Score" value={86} badge="+15%" badgeLabel="vs last week" />
          <MetricCard icon={<RiAlertFill size={18} className="text-primary-05" />} label="Booster Queue" value={3} badge="High Risk" badgeLabel="pending" />
        </MetricGrid>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start overflow-x-hidden">
          
          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            <ScorePerformanceWidget 
              data={chartData}
              isNEET={isNEET}
            />
            <PendingDPPsWidget />
          </div>

          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            <RecentTestsWidget />
            <AIRiskAlertWidget />
            <ActionRequiredWidget />
          </div>

        </div>
      </PageWrapper>
    </>
  );
}