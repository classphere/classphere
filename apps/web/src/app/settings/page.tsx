"use client";

import Navbar from "@/components/layout/Navbar";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  RiComputerLine, 
  RiCheckFill, 
  RiBuilding4Line, 
  RiTeamLine, 
  RiMailLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiNotification3Line,
  RiBankCardLine,
  RiPaletteLine,
  RiTimeLine
} from "@remixicon/react";

function SettingsContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const getTabs = () => {
    const baseTabs = [
      { id: "general", label: "General Info", icon: <RiSettings3Line size={18} /> },
      { id: "security", label: "Security", icon: <RiShieldCheckLine size={18} /> },
      { id: "notifications", label: "Notifications", icon: <RiNotification3Line size={18} /> },
    ];
    if (role === "institute_admin") {
      baseTabs.push({ id: "billing", label: "B2B Billing", icon: <RiBankCardLine size={18} /> });
      baseTabs.push({ id: "white_label", label: "White-Labeling", icon: <RiPaletteLine size={18} /> });
    }
    if (role === "teacher") {
      baseTabs.push({ id: "availability", label: "Availability", icon: <RiTimeLine size={18} /> });
    }
    return baseTabs;
  };

  const tabs = getTabs();

  // Helper toggle component
  const Toggle = ({ defaultOn = false }: { defaultOn?: boolean }) => {
    const [on, setOn] = useState(defaultOn);
    return (
      <button 
        onClick={() => setOn(!on)}
        className={`relative w-12 h-[26px] rounded-full p-1 flex items-center transition-colors cursor-pointer shrink-0 ${
          on ? 'bg-[#101010] dark:bg-t-primary' : 'bg-[#EAEAEA] dark:bg-s-stroke2/50'
        }`}
      >
        <div className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${on ? 'translate-x-[22px]' : 'translate-x-0'}`} />
      </button>
    );
  };

  return (
    <>
      <Navbar title={`${role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Settings`} subtitle="Manage your account preferences and configurations." />
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-6 pb-16 pt-6 xl:flex-row xl:items-start">

        {/* Left Nav Menu */}
        <div className="xl:sticky xl:top-6 xl:w-[280px] xl:shrink-0 flex flex-col gap-2">
          <div className="flex flex-row overflow-x-auto gap-2 xl:flex-col pb-4 xl:pb-0 hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-[14px] font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 shadow-md" 
                    : "text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/60 hover:text-[#101010] dark:hover:text-t-primary"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          
          <div className="card flex flex-col p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            
            {/* GENERAL INFO TAB */}
            {activeTab === "general" && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <h2 className="text-[20px] font-bold text-[#101010] dark:text-t-primary tracking-tight mb-8">General Information</h2>
                
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-24 h-24 rounded-full bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 flex items-center justify-center text-[#101010] dark:text-t-primary text-[32px] font-bold uppercase shadow-sm">
                    {role.charAt(0)}
                  </div>
                  <button className="flex items-center gap-2 h-10 px-5 rounded-[12px] bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[13px] font-bold text-[#101010] dark:text-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                    <RiCheckFill size={16} /> Update Avatar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Full Name</label>
                    <input type="text" className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" defaultValue={role === "teacher" ? "Aman Sir" : "Harsh Singh"} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Email Address</label>
                    <input type="email" className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" defaultValue={role === "student" ? "harshsingh15dec@gmail.com" : "admin@institute.com"} />
                  </div>
                </div>

                {role === "student" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Target Exam</label>
                      <select className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner appearance-none">
                        <option>JEE Main</option>
                        <option>JEE Advanced</option>
                        <option>NEET UG</option>
                        <option>SSC CGL</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Bio</label>
                      <input type="text" className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" defaultValue="Focusing on Physics and Maths" />
                    </div>
                  </div>
                )}

                {role === "teacher" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Primary Subject</label>
                      <select className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner appearance-none">
                        <option>Physics</option>
                        <option>Chemistry</option>
                        <option>Mathematics</option>
                        <option>Biology</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Designation</label>
                      <input type="text" className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary outline-none" defaultValue="Senior Faculty" readOnly />
                    </div>
                  </div>
                )}

                {role === "institute_admin" && (
                  <div className="grid grid-cols-1 gap-6 mb-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Institute Name</label>
                      <input type="text" className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" defaultValue="Vibrant Academy" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <h2 className="text-[20px] font-bold text-[#101010] dark:text-t-primary tracking-tight mb-8">Security & Access</h2>
                
                <div className="flex flex-col gap-8">
                  <div className="flex items-start justify-between border-b border-s-stroke2/30 pb-8">
                    <div className="pr-8">
                      <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">Two-Factor Authentication (2FA)</h3>
                      <p className="text-[14px] text-[#7B7B7B] leading-relaxed">Require a security key or authenticator app when logging in. Recommended for Institute Admins and Teachers.</p>
                    </div>
                    <Toggle defaultOn={role === "institute_admin" || role === "super_admin"} />
                  </div>

                  <div className="flex items-start justify-between pb-4">
                    <div className="pr-8">
                      <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">Active Sessions</h3>
                      <p className="text-[14px] text-[#7B7B7B] leading-relaxed flex items-center gap-2 mt-2">
                        <RiComputerLine size={16} /> MacBook Pro (Current) • IP: 192.168.1.1
                      </p>
                    </div>
                    <button className="h-10 px-5 rounded-[12px] bg-red-50 dark:bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[13px] font-bold text-[#EF4444] hover:bg-red-100 transition-colors shadow-sm shrink-0">
                      Revoke All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <h2 className="text-[20px] font-bold text-[#101010] dark:text-t-primary tracking-tight mb-8">Notification Preferences</h2>
                
                <div className="flex flex-col gap-8">
                  {role === "student" && (
                    <>
                      <div className="flex items-start justify-between border-b border-s-stroke2/30 pb-8">
                        <div>
                          <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">Test Reminders</h3>
                          <p className="text-[14px] text-[#7B7B7B]">Get notified 24 hours before a scheduled batch test.</p>
                        </div>
                        <Toggle defaultOn={true} />
                      </div>
                      <div className="flex items-start justify-between pb-4">
                        <div>
                          <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">Pedagogical Analysis Ready</h3>
                          <p className="text-[14px] text-[#7B7B7B]">Alert when the deterministic 9-stage analysis is complete for your submission.</p>
                        </div>
                        <Toggle defaultOn={true} />
                      </div>
                    </>
                  )}

                  {(role === "teacher" || role === "institute_admin") && (
                    <>
                      <div className="flex items-start justify-between border-b border-s-stroke2/30 pb-8">
                        <div>
                          <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">Student Escalations</h3>
                          <p className="text-[14px] text-[#7B7B7B]">Instant alerts when a student in your batch flags a doubt as 'urgent'.</p>
                        </div>
                        <Toggle defaultOn={true} />
                      </div>
                      <div className="flex items-start justify-between pb-4">
                        <div>
                          <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">Daily Batch Summary</h3>
                          <p className="text-[14px] text-[#7B7B7B]">Receive a morning email detailing student performance shifts and unresolved doubts.</p>
                        </div>
                        <Toggle defaultOn={false} />
                      </div>
                    </>
                  )}
                  
                  {role === "super_admin" && (
                    <div className="flex items-start justify-between pb-4">
                      <div>
                        <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">System Outage Alerts</h3>
                        <p className="text-[14px] text-[#7B7B7B]">Critical PagerDuty integration alerts for infrastructure spikes.</p>
                      </div>
                      <Toggle defaultOn={true} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* B2B BILLING TAB */}
            {activeTab === "billing" && role === "institute_admin" && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <h2 className="text-[20px] font-bold text-[#101010] dark:text-t-primary tracking-tight mb-8">B2B Subscription & Billing</h2>
                
                <div className="p-6 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[24px] mb-8 flex justify-between items-center">
                  <div>
                    <h3 className="text-[18px] font-bold text-[#101010] dark:text-t-primary mb-1">Enterprise Tier</h3>
                    <p className="text-[14px] text-[#7B7B7B]">Unlimited students. ₹50 / student / month.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[24px] font-bold text-[#101010] dark:text-t-primary mb-1">₹1,25,000<span className="text-[14px] text-[#7B7B7B] font-medium">/mo</span></div>
                    <span className="px-2.5 py-1 rounded-md bg-[rgba(0,166,86,0.1)] text-[#00A656] text-[12px] font-bold uppercase tracking-wider">Active</span>
                  </div>
                </div>

                <button className="h-12 px-6 rounded-[16px] bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 text-[14px] font-bold hover:bg-[#202020] transition-colors shadow-sm self-start">
                  Manage Payment Methods
                </button>
              </div>
            )}

            {/* WHITE LABELING TAB */}
            {activeTab === "white_label" && role === "institute_admin" && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <h2 className="text-[20px] font-bold text-[#101010] dark:text-t-primary tracking-tight mb-8">White-Labeling & Branding</h2>
                
                <div className="grid grid-cols-1 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Custom Domain (Portal URL)</label>
                    <div className="flex items-center">
                      <div className="h-12 px-4 bg-[#EAEAEA] dark:bg-s-stroke2/30 border border-r-0 border-s-stroke2/40 rounded-l-[16px] flex items-center justify-center text-[#7B7B7B] text-[14px] font-medium">
                        https://
                      </div>
                      <input type="text" className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-r-[16px] text-[15px] font-medium text-[#101010] dark:text-t-primary outline-none transition-colors shadow-inner" defaultValue="portal.vibrantacademy.com" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Brand Primary Color (Hex)</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[16px] bg-[#0A84FF] shadow-sm border border-s-stroke2/20"></div>
                      <input type="text" className="w-40 h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-[16px] text-[15px] font-bold text-[#101010] dark:text-t-primary outline-none uppercase tracking-widest" defaultValue="#0A84FF" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AVAILABILITY TAB */}
            {activeTab === "availability" && role === "teacher" && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <h2 className="text-[20px] font-bold text-[#101010] dark:text-t-primary tracking-tight mb-8">Doubt Resolution Availability</h2>
                
                <div className="flex items-start justify-between pb-8">
                  <div className="pr-8">
                    <h3 className="text-[16px] font-bold text-[#101010] dark:text-t-primary mb-1">Accepting New Doubts</h3>
                    <p className="text-[14px] text-[#7B7B7B]">When disabled, you will be hidden from the student doubt routing engine.</p>
                  </div>
                  <Toggle defaultOn={true} />
                </div>
              </div>
            )}

            {/* Global Actions */}
            <div className="mt-8 pt-8 border-t border-s-stroke2/30 flex items-center justify-end gap-4">
              <button className="h-12 px-6 rounded-[16px] text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[14px] font-semibold cursor-pointer">
                Discard Changes
              </button>
              <button 
                className={`h-12 px-8 rounded-[16px] text-[#FDFDFD] dark:text-b-surface1 text-[14px] font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center min-w-[160px] ${
                  saved ? 'bg-[#00A656]' : 'bg-[#101010] dark:bg-t-primary hover:bg-[#202020]'
                }`}
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? "Saving..." : saved ? <><RiCheckFill size={18} className="mr-2" /> Saved!</> : "Save Preferences"}
              </button>
            </div>
            
          </div>
        </div>

      </main>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-[#7B7B7B]">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
