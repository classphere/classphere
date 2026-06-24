"use client";

import { useState } from "react";
import { 
  RiBuilding4Line, 
  RiUserStarLine, 
  RiBrainLine,
  RiShieldCheckLine,
  RiAlertLine, 
  RiCheckFill, 
  RiTimeLine,
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiArrowDownSLine,
  RiArrowRightLine,
  RiSendPlaneFill,
  RiArrowRightUpLine
} from "@remixicon/react";
import Navbar from "@/components/layout/Navbar";

const mockPlatformStats = {
  totalInstitutes: 142,
  totalStudents: "94,210",
  activeAIAnalyses: 12450,
  systemUptime: "99.98%",
};

const auditLogs = [
  { id: 1, action: "New Institute Onboarded", detail: "Resonance Eduventures", time: "10m ago", type: "success" },
  { id: 2, action: "Question Bank Sync", detail: "JEE 2024 questions added", time: "1h ago", type: "info" },
  { id: 3, action: "Failed Login Attempt", detail: "IP: 58.12.9.34 blocked", time: "2h ago", type: "error" },
  { id: 4, action: "Subscription Upgraded", detail: "Vibrant Academy", time: "3h ago", type: "success" },
  { id: 5, action: "Rate Limit Hit", detail: "Allen Institute quota", time: "5h ago", type: "warning" },
];

const mockTickets = [
  { id: 1, name: "Gladyce", project: "API Integration", time: "09:00 AM", text: "Amazing. The new batch API is returning a 500 error for large payloads." },
  { id: 2, name: "Harsh", project: "Storage Limit", time: "10:30 AM", text: "We need an additional 50GB of storage for the upcoming test series." },
  { id: 3, name: "Priya", project: "Billing Issue", time: "01:15 PM", text: "The invoice for last month shows an incorrect amount. Please resolve." },
];

const systemResources = [
  { label: "API", fullName: "API Server", score: 85, load: "Normal", trend: "+2.4%" },
  { label: "DB", fullName: "Database", score: 65, load: "Normal", trend: "-1.2%" },
  { label: "Storage", fullName: "Storage Array", score: 92, load: "High", trend: "+14.5%" },
  { label: "Cache", fullName: "Redis Cache", score: 35, load: "Low", trend: "-5.0%" },
  { label: "Workers", fullName: "Background Workers", score: 78, load: "Normal", trend: "+8.1%" },
  { label: "CDN", fullName: "CDN Edge", score: 45, load: "Normal", trend: "+0.5%" },
];

export default function SuperAdminDashboardPage() {

  return (
    <>
      <Navbar 
        title="Platform Health" 
        subtitle="Superadmin overview and system analytics." 
      />
      
      <main className="mx-auto w-full max-w-[1560px] flex flex-col items-center pb-12 pt-6 gap-6 px-6 bg-transparent">

        {/* ── Main Layout: All widgets ── */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Top Row: Dashboard Overview (Full Width) */}
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
            <div className="box-hover" />
            
            {/* Widget Header */}
            <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
              <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
                Dashboard overview
              </h3>
              <div className="flex flex-row justify-between items-center px-5 py-3 gap-2 w-[160px] max-w-[180px] h-12 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] cursor-pointer">
                <span className="font-sans font-normal text-[14px] leading-[150%] tracking-[0.0025em] text-[#727272] dark:text-t-secondary">This Week</span>
                <RiArrowDownSLine size={20} className="text-[#727272] dark:text-t-secondary" />
              </div>
            </div>

            {/* Stats Section Wrapper (Row of 4 active highlighted boxes) */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
              
              {/* Metric 1: Total Institutes */}
              <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
                <div className="flex flex-row items-center gap-3 w-full mb-1">
                  <span className="text-[#101010] dark:text-t-primary"><RiBuilding4Line size={20} /></span>
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                    Total Institutes
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4 w-full mt-1">
                  <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                    {mockPlatformStats.totalInstitutes}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                      <span className="text-[#00A656] text-[12px] font-semibold leading-none">+2</span>
                    </div>
                    <span className="text-[12px] font-sans text-[#7B7B7B]">
                      this week
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric 2: Total Students */}
              <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
                <div className="flex flex-row items-center gap-3 w-full mb-1">
                  <span className="text-[#101010] dark:text-t-primary"><RiUserStarLine size={20} /></span>
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                    Total Students
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4 w-full mt-1">
                  <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                    {mockPlatformStats.totalStudents}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                      <span className="text-[#00A656] text-[12px] font-semibold leading-none">+8.1%</span>
                    </div>
                    <span className="text-[12px] font-sans text-[#7B7B7B]">
                      boost
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric 3: Active AI Analyses */}
              <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
                <div className="flex flex-row items-center gap-3 w-full mb-1">
                  <span className="text-[#101010] dark:text-t-primary"><RiBrainLine size={20} /></span>
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                    Active AI Analyses
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4 w-full mt-1">
                  <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                    12.4k
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                      <span className="text-[#00A656] text-[12px] font-semibold leading-none">+15%</span>
                    </div>
                    <span className="text-[12px] font-sans text-[#7B7B7B]">
                      vs last week
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric 4: System Uptime */}
              <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
                <div className="flex flex-row items-center gap-3 w-full mb-1">
                  <span className="text-[#101010] dark:text-t-primary"><RiShieldCheckLine size={20} className="text-[#00A656]" /></span>
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                    System Uptime
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4 w-full mt-1">
                  <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                    {mockPlatformStats.systemUptime}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                      <span className="text-[#00A656] text-[12px] font-semibold leading-none">Stable</span>
                    </div>
                    <span className="text-[12px] font-sans text-[#7B7B7B]">
                      all clear
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Middle Row: 2-column layout for Resources and Tickets */}
          <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
            
            {/* Left Column (System Resources) */}
            <div className="flex flex-col items-start gap-6 flex-1 min-w-0">
              {/* Product view (System Resources) */}
              <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
                <div className="box-hover" />
                
                {/* Widget Header */}
                <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
                  <div className="flex flex-col items-start gap-1">
                    <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
                      System Resources
                    </h3>
                    <span className="font-sans text-[14px] text-[#7B7B7B]">Live infrastructure load & distribution</span>
                  </div>
                </div>

                {/* Widget Content Area (Rows) */}
                <div className="relative z-10 flex flex-col items-start w-full gap-4 pt-2">
                  {systemResources.map((bar, idx) => (
                    <div key={idx} className="flex flex-row items-center justify-between w-full h-12 p-2 px-4 rounded-2xl hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/40 transition-colors cursor-pointer group/row">
                      
                      {/* Component Label */}
                      <div className="w-[140px] md:w-[160px] flex flex-col justify-center shrink-0">
                        <span className="font-sans text-[15px] font-semibold text-[#101010] dark:text-t-primary truncate">{bar.fullName}</span>
                        <span className="font-sans text-[12px] text-[#7B7B7B]">{bar.load} Load</span>
                      </div>
                      
                      {/* Progress Bar Track */}
                      <div className="flex-1 h-2.5 mx-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-full relative overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${
                            bar.score >= 85 ? 'from-[#FF6A55] to-[#FF453A] shadow-[0px_2px_12px_rgba(255,106,85,0.4)]' :
                            bar.score >= 65 ? 'from-[#FFD60A] to-[#FF9F0A] shadow-[0px_2px_12px_rgba(255,214,10,0.4)]' :
                            'from-[#00A656] to-[#00E576] shadow-[0px_2px_12px_rgba(0,181,18,0.4)]'
                          }`}
                          style={{ width: `${bar.score}%` }}
                        />
                      </div>
                      
                      {/* Score and Trend */}
                      <div className="w-[120px] flex flex-row items-center justify-end gap-3 shrink-0">
                        <span className="font-sans text-[18px] font-bold text-[#101010] dark:text-t-primary w-[44px] text-right leading-none">
                          {bar.score}%
                        </span>
                        <div className={`flex flex-row justify-center items-center px-2 py-1 gap-1 border rounded-md w-[68px] ${
                          bar.trend.startsWith('+') 
                            ? 'border-[rgba(255,106,85,0.15)] bg-[rgba(255,106,85,0.05)] text-[#FF6A55]' 
                            : 'border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] text-[#00A656]'
                        }`}>
                          <RiArrowRightUpLine size={14} className={bar.trend.startsWith('+') ? 'text-[#FF6A55]' : 'text-[#00A656] rotate-[90deg]'} />
                          <span className="text-[11px] font-semibold leading-none">{bar.trend}</span>
                        </div>
                      </div>
                      
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (Support Tickets) */}
            <div className="flex flex-col items-start gap-6 w-full xl:w-[420px] shrink-0">
              
              {/* Support Tickets (Comment Section) */}
              <div className="group relative card flex flex-col overflow-hidden p-3 pb-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none h-full min-h-[354px]">
                <div className="box-hover" />
                
                <div className="relative z-10 flex flex-col items-start gap-3 w-full">
                  
                  {/* Header */}
                  <div className="flex flex-row items-center p-[10px_12px] gap-2 w-full h-12">
                    <h3 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary m-0">
                      Recent Tickets
                    </h3>
                  </div>

                  {/* Comment List */}
                  <div className="flex flex-col items-start gap-2 w-full">
                    {mockTickets.map((ticket, index) => {
                      const isActive = index === 1; // Highlight active mock
                      
                      return (
                        <div key={ticket.id} className={`flex flex-row items-start p-5 gap-5 w-full rounded-[20px] cursor-pointer transition-all ${
                          isActive ? 'bg-[#F9F9F9] dark:bg-b-surface1/60 shadow-[inset_0px_0px_0px_3px_#FFFFFF] dark:shadow-none border border-s-stroke2/20' : 'bg-transparent hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30 border border-transparent dark:hover:border-s-stroke2/20'
                        }`}>
                          
                          <div className="w-11 h-11 bg-gradient-to-br from-[#D2F4FF] to-[#A1E0F5] rounded-full shrink-0 flex items-center justify-center text-[#101010] font-bold shadow-sm">
                            {ticket.name.charAt(0)}
                          </div>

                          <div className="flex flex-col items-start gap-3 flex-1 min-w-0 mt-0.5">
                            <div className="flex flex-col items-start gap-1 w-full">
                              <div className="flex flex-row items-center gap-1.5 w-full flex-wrap">
                                <span className="font-sans font-semibold text-[16px] leading-none tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                                  {ticket.name}
                                </span>
                                <span className="font-sans font-medium text-[14px] leading-none tracking-[0.0015em] text-[#727272]">
                                  on
                                </span>
                                <span className="font-sans font-semibold text-[16px] leading-none tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate max-w-[120px]">
                                  {ticket.project}
                                </span>
                              </div>
                              <span className="font-sans font-normal text-[12px] leading-none tracking-[0.004em] text-[#7B7B7B]">
                                {ticket.time}
                              </span>
                            </div>
                            
                            <span className="font-sans font-normal text-[16px] leading-[150%] tracking-[0.005em] text-[#101010] dark:text-t-primary w-full line-clamp-2">
                              "{ticket.text}"
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col items-start px-3 w-full mt-2">
                    <button className="flex flex-row justify-center items-center px-7 py-[14px] gap-2 w-full h-12 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[32px] bg-transparent cursor-pointer hover:bg-b-surface1 transition-colors">
                      <span className="font-sans font-semibold text-[14px] leading-none text-center tracking-[0.0125em] text-[#727272] dark:text-t-secondary">
                        Go to Helpdesk
                      </span>
                    </button>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* Bottom Row: Audit Logs (Full Width) */}
          <div className="flex flex-col w-full">
            {/* Audit Logs (Product List) */}
            <div className="group relative card flex flex-col overflow-hidden p-3 pb-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
              <div className="box-hover" />
              
              <div className="relative z-10 flex flex-col items-start gap-3 w-full">
                
                {/* Header */}
                <div className="flex flex-row items-center p-[10px_12px] w-full h-12 px-3">
                  <h3 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary m-0">
                    Audit Log
                  </h3>
                </div>

                {/* Product List */}
                <div className="flex flex-col items-start gap-2 w-full px-3">
                  {auditLogs.slice(0,4).map((log, index) => {
                    const isActive = index === 1; // Figma mock highlight 2nd item
                    const statusClass = log.type === 'success' ? 'bg-[rgba(0,166,86,0.05)] border-[rgba(0,166,86,0.15)] text-[#00A656]' : 
                                      log.type === 'error' ? 'bg-[rgba(255,106,85,0.05)] border-[rgba(255,106,85,0.15)] text-[#FF6A55]' :
                                      'bg-[rgba(42,133,255,0.05)] border-[rgba(42,133,255,0.15)] text-[#2A85FF]';
                    
                    return (
                      <div key={log.id} className={`flex flex-row items-center p-4 gap-6 w-full h-[88px] rounded-[20px] cursor-pointer transition-all ${
                        isActive ? 'bg-[#F9F9F9] dark:bg-b-surface1/60 shadow-[inset_0px_0px_0px_3px_#FFFFFF] dark:shadow-none border border-s-stroke2/20' : 'bg-transparent hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30 border border-transparent dark:hover:border-s-stroke2/20'
                      }`}>
                        
                        <div className="flex flex-row items-center gap-6 flex-1 min-w-0">
                          <div className={`flex items-center justify-center w-14 h-14 rounded-xl shrink-0 ${statusClass} border`}>
                            {log.type === 'success' ? <RiCheckFill size={20} /> : log.type === 'error' ? <RiAlertLine size={20} /> : <RiTimeLine size={20} />}
                          </div>
                          <div className="flex flex-col justify-center gap-1 min-w-0 w-[400px]">
                            <span className="font-sans font-semibold text-[16px] leading-none tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                              {log.action}
                            </span>
                            <span className="font-sans text-[13px] text-[#7B7B7B] truncate">
                              {log.detail}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-row justify-end items-center gap-8 shrink-0 min-w-[200px]">
                          <span className="font-sans font-medium text-[14px] leading-none text-right text-[#727272]">
                            {log.time}
                          </span>
                          <div className={`flex flex-row justify-center items-center px-3 py-1 gap-2 border rounded-[8px] w-[80px] ${statusClass}`}>
                            <span className="font-sans font-bold text-[12px] leading-none tracking-[0.01em]">
                              {log.type === 'success' ? 'Resolved' : log.type === 'error' ? 'Failed' : 'Info'}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex flex-col items-start px-3 w-full mt-4">
                  <button className="flex flex-row justify-center items-center px-7 py-[14px] gap-2 w-[200px] h-12 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent cursor-pointer hover:bg-b-surface1 transition-colors">
                    <span className="font-sans font-semibold text-[14px] leading-none text-center tracking-[0.0125em] text-[#727272] dark:text-t-secondary">
                      View full audit log
                    </span>
                    <RiArrowRightLine size={18} className="text-[#727272]" />
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
