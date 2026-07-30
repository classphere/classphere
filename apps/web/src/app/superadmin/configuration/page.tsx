"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { 
  RiErrorWarningLine, 
  RiSave3Line,
  RiSettings4Line,
  RiCpuLine,
  RiBuilding3Line,
  RiServerLine,
  RiLoader4Line,
  RiCalendarEventLine,
  RiPencilLine,
  RiCheckLine,
} from "@remixicon/react";

export default function ConfigurationPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [maintenance, setMaintenance] = useState(false);
  const [deterministicEngine, setDeterministicEngine] = useState(true);
  const [customDomain, setCustomDomain] = useState(true);
  const [forumModeration, setForumModeration] = useState(false);
  
  // Infrastructure settings
  const [maxConcurrentUsers, setMaxConcurrentUsers] = useState(250000);
  const [omrIngestionRate, setOmrIngestionRate] = useState(1200);
  const [maxBulkUploadSize, setMaxBulkUploadSize] = useState(500);
  const [sessionTimeout, setSessionTimeout] = useState(120);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Exam Calendar
  type CalRow = { exam_code: string; exam_label: string; suggested_ends_at: string; notes: string | null };
  const [calendar, setCalendar] = useState<CalRow[]>([]);
  const [calEdits, setCalEdits] = useState<Record<string, { suggested_ends_at: string; notes: string }>>({});
  const [calSaving, setCalSaving] = useState<Record<string, boolean>>({});
  const [calMsg, setCalMsg] = useState<Record<string, string>>({});

  const loadCalendar = () => {
    apiClient.get<{ success: boolean; data: { calendar: CalRow[] } }>("/api/v1/batches/exam-calendar")
      .then((res) => {
        if (res.success) {
          setCalendar(res.data.calendar);
          const edits: Record<string, { suggested_ends_at: string; notes: string }> = {};
          res.data.calendar.forEach((row) => { edits[row.exam_code] = { suggested_ends_at: row.suggested_ends_at, notes: row.notes ?? "" }; });
          setCalEdits(edits);
        }
      }).catch(() => {});
  };

  const saveCalRow = async (examCode: string) => {
    if (!token) return;
    setCalSaving((s) => ({ ...s, [examCode]: true }));
    setCalMsg((m) => ({ ...m, [examCode]: "" }));
    try {
      const edit = calEdits[examCode];
      const res: any = await apiClient.patch(`/api/v1/batches/exam-calendar/${examCode}`, { suggested_ends_at: edit.suggested_ends_at, notes: edit.notes || null }, token);
      if (res.success) {
        setCalMsg((m) => ({ ...m, [examCode]: "✓ Saved" }));
        setTimeout(() => setCalMsg((m) => ({ ...m, [examCode]: "" })), 2000);
        loadCalendar();
      } else setCalMsg((m) => ({ ...m, [examCode]: res.message }));
    } catch (e: any) { setCalMsg((m) => ({ ...m, [examCode]: e.message })); }
    finally { setCalSaving((s) => ({ ...s, [examCode]: false })); }
  };

  // Load config on mount
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiClient.get("/api/v1/superadmin/config", token)
      .then(res => {
        if (res.success && res.data) {
          const cfg = res.data;
          if (cfg.maintenance_mode !== undefined) setMaintenance(cfg.maintenance_mode);
          if (cfg.deterministic_engine !== undefined) setDeterministicEngine(cfg.deterministic_engine);
          if (cfg.custom_domains_enabled !== undefined) setCustomDomain(cfg.custom_domains_enabled);
          if (cfg.forum_moderation_enabled !== undefined) setForumModeration(cfg.forum_moderation_enabled);
          if (cfg.max_concurrent_users !== undefined) setMaxConcurrentUsers(Number(cfg.max_concurrent_users));
          if (cfg.omr_ingestion_rate !== undefined) setOmrIngestionRate(Number(cfg.omr_ingestion_rate));
          if (cfg.max_bulk_upload_size !== undefined) setMaxBulkUploadSize(Number(cfg.max_bulk_upload_size));
          if (cfg.session_timeout !== undefined) setSessionTimeout(Number(cfg.session_timeout));
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        loadCalendar();
      });
  }, [token]);

  const handleSave = async () => {
    setMessage("These controls are disabled until each setting has a real runtime implementation. No configuration was saved.");
  };

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
  <Navbar title="Platform Configuration" subtitle="Runtime controls are unavailable until a managed configuration plane is connected." />
      
      <main className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-6">
        
        {message && (
          <div className="mb-6 p-4 rounded-[10px] border border-s-stroke2/40 bg-b-surface2 text-t-primary font-sans text-sm font-semibold flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-t-secondary hover:text-t-primary font-bold">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-32 text-t-secondary">
            <RiLoader4Line size={24} className="animate-spin text-primary-01" />
            <span className="font-sans font-semibold text-[15px]">Loading system settings...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Toggles */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              
              {/* System Maintenance */}
              <div className={`group relative flex flex-col p-8 rounded-[24px] border overflow-hidden transition-colors ${
                maintenance 
                  ? 'bg-white dark:bg-white/[0.02] border-red-500/40' 
                  : 'bg-white dark:bg-white/[0.02] border-s-stroke2/40'
              }`}>

                <div className="relative z-10 flex justify-between items-center w-full mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${maintenance ? 'bg-red-50 text-red-500' : 'bg-b-surface1 dark:bg-b-surface1 text-t-primary dark:text-t-primary'}`}>
                      <RiSettings4Line size={20} />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-bold text-t-primary dark:text-t-primary tracking-tight">System Maintenance Mode</h2>
                    </div>
                  </div>
                  <Toggle enabled={maintenance} onChange={() => setMaintenance(!maintenance)} />
                </div>
                
                <p className="relative z-10 text-[14px] text-t-secondary leading-relaxed mb-5 pl-13">
                  Maintenance mode is not connected yet. This control is intentionally non-operative and does not change user access.
                </p>
                
                {maintenance && (
                  <div className="relative z-10 ml-13 p-4 bg-[rgba(239,68,68,0.05)] border border-s-stroke2/40 rounded-[10px] flex items-start gap-3">
                    <RiErrorWarningLine size={20} className="text-primary-03 shrink-0 mt-0.5" />
                    <span className="text-[14px] font-semibold text-primary-03">
                      This is only a draft value. It is not applied to the running platform.
                    </span>
                  </div>
                )}
              </div>

              {/* Analysis Engine Config */}
              <div className="group relative flex flex-col p-8 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] overflow-hidden">

                <div className="relative z-10 flex items-center gap-3 mb-6 pb-6 border-b border-s-stroke2/30">
                  <div className="w-10 h-10 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 flex items-center justify-center text-t-primary dark:text-t-primary border border-s-stroke2/30">
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

                </div>
              </div>

              {/* B2B Settings */}
              <div className="group relative flex flex-col p-8 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] overflow-hidden">

                <div className="relative z-10 flex items-center gap-3 mb-6 pb-6 border-b border-s-stroke2/30">
                  <div className="w-10 h-10 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 flex items-center justify-center text-t-primary dark:text-t-primary border border-s-stroke2/30">
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
              <div className="group relative flex flex-col p-8 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] overflow-hidden sticky top-6">

                <div className="relative z-10 flex items-center gap-3 mb-6 pb-6 border-b border-s-stroke2/30">
                  <div className="w-10 h-10 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 flex items-center justify-center text-t-primary dark:text-t-primary border border-s-stroke2/30">
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
                      className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                      value={maxConcurrentUsers}
                      onChange={(e) => setMaxConcurrentUsers(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">OMR Ingestion Rate (Req/Min)</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                      value={omrIngestionRate}
                      onChange={(e) => setOmrIngestionRate(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Max Bulk Upload Size</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                        value={maxBulkUploadSize}
                        onChange={(e) => setMaxBulkUploadSize(Number(e.target.value))}
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
                      className="w-full h-11 px-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] font-medium text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="relative z-10 w-full h-px bg-s-stroke2/30 my-6" />
                
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="relative z-10 flex items-center justify-center gap-2 w-full h-12 rounded-[10px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white text-[14px] font-bold shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <RiLoader4Line size={18} className="animate-spin" />
                  ) : (
                    <RiSave3Line size={18} />
                  )}
                  Save Changes
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ── Exam Calendar ── */}
        <div className="relative z-10 overflow-hidden rounded-[20px] border border-s-stroke2/40 bg-b-surface2/60 dark:bg-b-surface2/40 p-6 shadow-widget backdrop-blur-sm mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-9 items-center justify-center rounded-[10px] bg-primary-05/10 border border-primary-05/20">
              <RiCalendarEventLine size={18} className="text-primary-05" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-t-primary">Exam Calendar</h2>
              <p className="text-[12px] text-t-secondary mt-0.5">Suggested batch expiry dates. Institutes auto-fill from these when creating batches. Update when exams get postponed.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-s-stroke2/40">
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-t-secondary">Exam</th>
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-t-secondary">Suggested Expiry</th>
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-t-secondary hidden md:table-cell">Notes</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s-stroke2/30">
                {calendar.map((row) => {
                  const edit = calEdits[row.exam_code] ?? { suggested_ends_at: row.suggested_ends_at, notes: row.notes ?? "" };
                  const isSaving = calSaving[row.exam_code];
                  const msg = calMsg[row.exam_code];
                  return (
                    <tr key={row.exam_code} className="group hover:bg-b-surface1/50 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-t-primary text-[13px]">{row.exam_label}</p>
                        <p className="text-[11px] text-t-secondary font-mono mt-0.5">{row.exam_code}</p>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="date"
                          value={edit.suggested_ends_at}
                          onChange={(e) => setCalEdits((prev) => ({ ...prev, [row.exam_code]: { ...edit, suggested_ends_at: e.target.value } }))}
                          className="h-9 w-40 rounded-[8px] border border-s-stroke2/60 bg-b-surface1 px-3 text-[13px] font-medium text-t-primary focus:border-primary-01 outline-none transition-colors"
                        />
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <input
                          type="text"
                          placeholder="Optional note…"
                          value={edit.notes}
                          onChange={(e) => setCalEdits((prev) => ({ ...prev, [row.exam_code]: { ...edit, notes: e.target.value } }))}
                          className="h-9 w-full min-w-[180px] rounded-[8px] border border-s-stroke2/60 bg-b-surface1 px-3 text-[13px] text-t-primary focus:border-primary-01 outline-none transition-colors"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {msg && <span className={`text-[11px] font-semibold ${msg.startsWith("✓") ? "text-primary-02" : "text-primary-03"}`}>{msg}</span>}
                          <button
                            onClick={() => saveCalRow(row.exam_code)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-b-surface1 border border-s-stroke2/50 text-[12px] font-semibold text-t-secondary hover:text-t-primary transition-colors disabled:opacity-50"
                          >
                            {isSaving ? <RiLoader4Line size={13} className="animate-spin" /> : <RiCheckLine size={13} />}
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {calendar.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-[13px] text-t-secondary">No exam calendar data. Run migration 28 in Supabase SQL Editor.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
