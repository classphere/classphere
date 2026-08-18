"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import {
  RiErrorWarningLine,
  RiSave3Line,
  RiSettings4Line,
  RiLoader4Line,
  RiCalendarEventLine,
  RiCheckLine,
} from "@remixicon/react";

/**
 * Maintenance mode is the only platform-wide switch this page carries.
 *
 * It previously showed seven more — deterministic engine, custom domains,
 * forum moderation, max concurrent users, OMR ingestion rate, max bulk upload
 * size, session timeout. Every one of them was removed rather than left
 * disabled: three named features that were never built (OMR ingestion, bulk
 * upload caps, session timeout), one for a forum that does not exist, one cap
 * on concurrent users that we do not want to impose, custom domains which are
 * provisioned by hand, and a toggle over the analysis engine — which is core
 * behaviour that should not be switchable at runtime.
 *
 * A control that names a capability the platform does not have is worse than
 * no control: it reads as a feature to whoever opens this page.
 */
export default function ConfigurationPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [maintenance, setMaintenance] = useState(false);

  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Exam Calendar
  type CalRow = { exam_code: string; exam_label: string; suggested_ends_at: string; notes: string | null };
  const [calEdits, setCalEdits] = useState<Record<string, { suggested_ends_at: string; notes: string }>>({});
  const [calSaving, setCalSaving] = useState<Record<string, boolean>>({});
  const [calMsg, setCalMsg] = useState<Record<string, string>>({});

  const CALENDAR_PATH = "/api/v1/batches/exam-calendar";
  const CONFIG_PATH = "/api/v1/superadmin/config";
  const { data: calendarData } = useApiQuery<{ calendar: CalRow[] }>(CALENDAR_PATH);
  const calendar = calendarData?.calendar ?? [];
  const loadCalendar = () => queryClient.invalidateQueries({ queryKey: [CALENDAR_PATH] });

  // Each row is editable, so server values seed the edit buffer when they land
  // and the buffer owns the fields from then on.
  const calendarRows = calendarData?.calendar;
  useEffect(() => {
    if (!calendarRows) return;
    const edits: Record<string, { suggested_ends_at: string; notes: string }> = {};
    calendarRows.forEach((row) => { edits[row.exam_code] = { suggested_ends_at: row.suggested_ends_at, notes: row.notes ?? "" }; });
    setCalEdits(edits);
  }, [calendarRows]);

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

  const { data: config, isPending: loading } = useApiQuery<Record<string, any>>(CONFIG_PATH);
  useEffect(() => {
    if (!config) return;
    if (config.maintenance_mode !== undefined) setMaintenance(config.maintenance_mode);
  }, [config]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const res: any = await apiClient.patch(CONFIG_PATH, { settings: { maintenance_mode: maintenance } }, token);
      if (res.success) {
        setMessage(
          maintenance
            ? "Maintenance mode is ON. New sign-ins and new test starts are blocked. Tests already in progress can still be finished and submitted."
            : "Maintenance mode is OFF. The platform is open to everyone.",
        );
        queryClient.invalidateQueries({ queryKey: [CONFIG_PATH] });
      } else {
        setMessage(res.message ?? "Could not save.");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
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
        className={`w-[18px] h-[18px] rounded-full bg-white shadow-widget transition-transform duration-200 ease-out ${
          enabled ? 'translate-x-[22px]' : 'translate-x-0'
        }`} 
      />
    </button>
  );

  return (
    <>
  <Navbar title="Platform Configuration" subtitle="Platform-wide controls and the exam calendar." />
      
      <main className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-6">
        
        {message && (
          <div className="mb-3 p-4 rounded-[10px] border border-s-stroke2/40 bg-b-surface2 text-t-primary font-sans text-sm font-semibold flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-t-secondary hover:text-t-primary font-bold">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-t-secondary">
            <RiLoader4Line size={24} className="animate-spin text-primary-01" />
            <span className="font-sans font-semibold text-[15px]">Loading system settings...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">

              {/* System Maintenance */}
              <div className={`group relative flex flex-col p-5 rounded-[24px] border overflow-hidden transition-colors ${
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
                
                <p className="relative z-10 text-[14px] text-t-secondary leading-relaxed mb-3 pl-13">
                  Blocks new sign-ins and new test starts for everyone except you. A test already
                  in progress keeps running and can be submitted, so nobody loses a paper they are
                  sitting. Takes effect as soon as you save.
                </p>

                {maintenance && (
                  <div className="relative z-10 ml-13 p-4 bg-[rgba(239,68,68,0.05)] border border-s-stroke2/40 rounded-[10px] flex items-start gap-3">
                    <RiErrorWarningLine size={20} className="text-primary-03 shrink-0 mt-0.5" />
                    <span className="text-[14px] font-semibold text-primary-03">
                      Students, teachers and institute admins will not be able to sign in once you save this.
                    </span>
                  </div>
                )}

                <div className="relative z-10 mt-4 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary h-12 gap-2 text-[14px] disabled:opacity-50"
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
        <div className="relative z-10 overflow-hidden rounded-[20px] border border-s-stroke2/40 bg-b-surface2/60 dark:bg-b-surface2/40 p-6 shadow-widget backdrop-blur-sm mt-3">
          <div className="flex items-center gap-3 mb-3">
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
