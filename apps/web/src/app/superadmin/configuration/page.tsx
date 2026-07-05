"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { 
  RiErrorWarningLine, 
  RiSave3Line,
  RiSettings4Line,
  RiShieldCheckLine,
  RiCpuLine,
  RiBuilding3Line,
  RiServerLine
} from "@remixicon/react";

export default function ConfigurationPage() {
  const [maintenance, setMaintenance] = useState(false);
  
  // Analysis Engine Settings
  const [deterministicEngine, setDeterministicEngine] = useState(true);
  const [sscPacing, setSscPacing] = useState(true);
  
  // B2B & Platform Settings
  const [customDomain, setCustomDomain] = useState(true);
  const [forumModeration, setForumModeration] = useState(false);

  // Toggle Component Helper
  const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: () => void }) => (
    <button 
      onClick={onChange}
      className={`relative w-12 h-[26px] rounded-full p-1 flex items-center transition-colors cursor-pointer shrink-0 ${
        enabled ? 'bg-shade-02 dark:bg-t-primary' : 'bg-s-stroke2 dark:bg-s-stroke2/50'
      }`}
    >
      <div 
        className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          enabled ? 'translate-x-[22px]' : 'translate-x-0'
        }`} 
      />
    </button>
  );

  return (
    <>
      <Navbar title="Platform Configuration" subtitle="Manage system behaviors, feature flags, and infrastructure limits." />
      
      <main className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Toggles */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* System Maintenance */}
            <div className={`group relative card flex flex-col p-8 rounded-lg shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border overflow-hidden transition-colors ${
              maintenance 
                ? 'bg-b-surface2 dark:bg-b-surface2 border-red-500/40' 
                : 'bg-b-surface2 dark:bg-b-surface2 border-s-stroke2/40'
            }`}>
              <div className="box-hover" />
              
              <div className="relative z-10 flex justify-between items-center w-full mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${maintenance ? 'bg-red-50 text-red-500' : 'bg-b-surface1 dark:bg-b-surface1 text-t-primary dark:text-t-primary'}`}>
                    <RiSettings4Line size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-bold text-t-primary dark:text-t-primary tracking-tight">System Maintenance Mode</h2>
                  </div>
                </div>
                <Toggle enabled={maintenance} onChange={() => setMaintenance(!maintenance)} />
              </div>
              
              <p className="relative z-10 text-[14px] text-t-secondary leading-relaxed mb-5 pl-13">
                Enabling maintenance mode will force log out all active users and display a maintenance screen. Only Super Admins will be able to log in to bypass this block.
              </p>
              
              {maintenance && (
                <div className="relative z-10 ml-13 p-4 bg-[rgba(239,68,68,0.05)] border border-s-stroke2/40 rounded-lg flex items-start gap-3">
                  <RiErrorWarningLine size={20} className="text-primary-03 shrink-0 mt-0.5" />
                  <span className="text-[14px] font-semibold text-primary-03">
                    The platform is currently in maintenance mode. Active scaling and background jobs are paused.
                  </span>
                </div>
              )}
            </div>

            {/* Analysis Engine Config */}
            <div className="group relative card flex flex-col p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden">
              <div className="box-hover" />
              
              <div className="relative z-10 flex items-center gap-3 mb-6 pb-6 border-b border-s-stroke2/30">
                <div className="w-10 h-10 rounded-lg bg-b-surface1 dark:bg-b-surface1 flex items-center justify-center text-t-primary dark:text-t-primary border border-s-stroke2/30">
                  <RiCpuLine size={20} />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-t-primary dark:text-t-primary tracking-tight">Analysis Engine</h2>
                  <p className="text-[13px] text-t-secondary font-medium mt-0.5">Control the 9-stage deterministic evaluation pipeline</p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex justify-between items-start gap-6">
                  <div>
                    <h3 className="text-[15px] font-bold text-t-primary dark:text-t-primary mb-1">Deterministic Pedagogical Reporting</h3>
                    <p className="text-[13px] text-t-secondary leading-relaxed">
                      Enables the 9-stage rule-based analysis engine (Fatigue Curve, Panic Cascade, Subject Movement) across all JEE/NEET exams. Replaces legacy generative AI reporting.
                    </p>
                  </div>
                  <Toggle enabled={deterministicEngine} onChange={() => setDeterministicEngine(!deterministicEngine)} />
                </div>

                <div className="w-full h-px bg-s-stroke2/30" />

                <div className="flex justify-between items-start gap-6">
                  <div>
                    <h3 className="text-[15px] font-bold text-t-primary dark:text-t-primary mb-1">Strict SSC Pacing Locks</h3>
                    <p className="text-[13px] text-t-secondary leading-relaxed">
                      Enforces the 15-minute intra-section locks specifically for SSC and Bank PO examinations. Applies universally across all B2B partner platforms.
                    </p>
                  </div>
                  <Toggle enabled={sscPacing} onChange={() => setSscPacing(!sscPacing)} />
                </div>
              </div>
            </div>

            {/* B2B Settings */}
            <div className="group relative card flex flex-col p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden">
              <div className="box-hover" />
              
              <div className="relative z-10 flex items-center gap-3 mb-6 pb-6 border-b border-s-stroke2/30">
                <div className="w-10 h-10 rounded-lg bg-b-surface1 dark:bg-b-surface1 flex items-center justify-center text-t-primary dark:text-t-primary border border-s-stroke2/30">
                  <RiBuilding3Line size={20} />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-t-primary dark:text-t-primary tracking-tight">B2B & White-Labeling</h2>
                  <p className="text-[13px] text-t-secondary font-medium mt-0.5">Manage partner features and multi-tenant isolation</p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex justify-between items-start gap-6">
                  <div>
                    <h3 className="text-[15px] font-bold text-t-primary dark:text-t-primary mb-1">Custom Domain Routing</h3>
                    <p className="text-[13px] text-t-secondary leading-relaxed">
                      Allows Enterprise coaching partners to route their student portals via custom domains with automated SSL provisioning.
                    </p>
                  </div>
                  <Toggle enabled={customDomain} onChange={() => setCustomDomain(!customDomain)} />
                </div>

                <div className="w-full h-px bg-s-stroke2/30" />

                <div className="flex justify-between items-start gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-bold text-t-primary dark:text-t-primary">Community Forum Moderation</h3>
                      <span className="px-2 py-0.5 rounded-md bg-[rgba(255,159,10,0.1)] text-[#FF9F0A] text-[10px] font-bold uppercase tracking-wider">Beta</span>
                    </div>
                    <p className="text-[13px] text-t-secondary leading-relaxed">
                      Enables the peer-to-peer Batch Discussion Forum for students, featuring reputation-based gamification to reduce direct faculty doubt-resolution workload.
                    </p>
                  </div>
                  <Toggle enabled={forumModeration} onChange={() => setForumModeration(!forumModeration)} />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Infrastructure Limits */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="group relative card flex flex-col p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden sticky top-6">
              <div className="box-hover" />
              
              <div className="relative z-10 flex items-center gap-3 mb-6 pb-6 border-b border-s-stroke2/30">
                <div className="w-10 h-10 rounded-lg bg-b-surface1 dark:bg-b-surface1 flex items-center justify-center text-t-primary dark:text-t-primary border border-s-stroke2/30">
                  <RiServerLine size={20} />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-t-primary dark:text-t-primary tracking-tight">Infrastructure</h2>
                  <p className="text-[13px] text-t-secondary font-medium mt-0.5">Global scale & rate limits</p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Max Concurrent Users</label>
                  <input 
                    type="number" 
                    className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                    defaultValue={250000} 
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">OMR Ingestion Rate (Req/Min)</label>
                  <input 
                    type="number" 
                    className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                    defaultValue={1200} 
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Max Bulk Upload Size</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                      defaultValue={500} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-t-secondary font-medium pointer-events-none">
                      Files
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Session Timeout (Min)</label>
                  <input 
                    type="number" 
                    className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                    defaultValue={120} 
                  />
                </div>
              </div>
              
              <div className="relative z-10 w-full h-px bg-s-stroke2/30 my-6" />
              
              <button className="relative z-10 flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-shade-02 dark:bg-t-primary text-t-light dark:text-b-surface1 text-[14px] font-bold hover:bg-shade-04 transition-all shadow-sm active:scale-[0.98] cursor-pointer">
                <RiSave3Line size={18} />
                Save Changes
              </button>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
