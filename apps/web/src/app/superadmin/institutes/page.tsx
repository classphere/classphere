"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { StatCard, StatCardGrid } from "@/components/shared/StatCard";
import { Modal } from "@/components/shared/Modal";
import { useInstitutes } from "@/lib/hooks/useInstitutes";
import { useSuperadminStats } from "@/lib/hooks/useSuperadminStats";
import {
  RiBuilding4Line,
  RiMore2Fill,
  RiSearchLine,
  RiFilter3Line,
  RiArrowDownSLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
} from "@remixicon/react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatStudentCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatMRR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

function planBadgeClass(plan: string): string {
  switch (plan.toLowerCase()) {
    case "enterprise": return "bg-[rgba(94,92,230,0.08)] text-[#5E5CE6]";
    case "pro":        return "bg-[rgba(10,132,255,0.08)] text-[#0A84FF]";
    default:           return "bg-b-surface1 dark:bg-b-surface1 text-t-secondary";
  }
}

// ─── Inline feedback banner ───────────────────────────────────────────────────

function FeedbackBanner({ type, message }: { type: "success" | "error"; message: string }) {
  if (!message) return null;
  const isSuccess = type === "success";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-medium border ${
      isSuccess
        ? "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02"
        : "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03"
    }`}>
      {isSuccess
        ? <RiCheckboxCircleLine size={16} />
        : <RiErrorWarningLine size={16} />}
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstitutesPage() {
  // Real data hooks
  const { institutes, loading: listLoading, error: listError, createInstitute, refetch } = useInstitutes();
  const { stats, loading: statsLoading, refetch: refetchStats } = useSuperadminStats();

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInstituteData, setNewInstituteData] = useState({
    name: "",
    adminEmail: "",
    adminUsername: "",
    type: "jee",
    price: 500,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Credentials modal (shown once after successful provisioning)
  const [credentials, setCredentials] = useState<{ email: string; password: string; instituteName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
    document.body.removeChild(textArea);
  };

  // Search
  const [search, setSearch] = useState("");

  const filteredInstitutes = institutes.filter(
    (inst) =>
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      (inst.owner_email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateInstitute = async () => {
    if (!newInstituteData.name || !newInstituteData.adminEmail || !newInstituteData.adminUsername) {
      setFeedback({ type: "error", message: "Please provide Institute Name, Admin Email, and Admin Username." });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    const result = await createInstitute(newInstituteData);

    if (result.success) {
      setIsCreateModalOpen(false);
      setNewInstituteData({ name: "", adminEmail: "", adminUsername: "", type: "jee", price: 500 });
      setFeedback(null);
      refetchStats();
      // Show the one-time credentials modal
      if (result.tempPassword) {
        setCredentials({
          email: newInstituteData.adminEmail,
          password: result.tempPassword,
          instituteName: newInstituteData.name,
        });
      }
    } else {
      setFeedback({ type: "error", message: result.message });
    }

    setIsCreating(false);
  };

  const openModal = () => {
    setFeedback(null);
    setNewInstituteData({ name: "", adminEmail: "", adminUsername: "", type: "jee", price: 500 });
    setIsCreateModalOpen(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar title="Institutes CRM" subtitle="Manage your partner database and enterprise clients." />
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6">

        {/* KPI Cards */}
        <StatCardGrid cols={4} className="mb-8">
          <StatCard
            title="Total Institutes"
            value={statsLoading ? "—" : (stats?.totalInstitutes ?? 0)}
            badge={statsLoading ? "" : `+${stats?.newInstitutesThisWeek ?? 0}`}
            subtext="this week"
          />
          <StatCard
            title="Active Students"
            value={statsLoading ? "—" : formatStudentCount(stats?.totalStudents ?? 0)}
            badge={statsLoading ? "" : `+${stats?.newStudentsThisWeek ?? 0}`}
            subtext="this week"
          />
          <StatCard
            title="Enterprise Plans"
            value={statsLoading ? "—" : (stats?.enterprisePlans ?? 0)}
            badge=""
            subtext="active clients"
          />
          <StatCard
            title="Est. MRR"
            value={statsLoading ? "—" : formatMRR(stats?.estimatedMRR ?? 0)}
            badge=""
            subtext="price × institutes"
          />
        </StatCardGrid>

        {/* Data Table */}
        <div className="group relative card flex flex-col rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden">
          <div className="box-hover" />

          {/* Table Header Controls */}
          <div className="relative z-10 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between border-b border-s-stroke2/30">
            <div className="relative w-full max-w-md flex items-center">
              <RiSearchLine size={18} className="absolute left-4 text-t-secondary" />
              <input
                type="text"
                placeholder="Search institutes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] text-t-primary dark:text-t-primary placeholder:text-t-secondary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 h-11 px-5 rounded-lg bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-semibold text-t-primary dark:text-t-primary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                Filter by <RiFilter3Line size={16} className="text-t-secondary" />
              </button>
              <button className="flex items-center gap-2 h-11 px-5 rounded-lg bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-semibold text-t-primary dark:text-t-primary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                Sort by <RiArrowDownSLine size={16} className="text-t-secondary" />
              </button>
              <button
                onClick={openModal}
                className="flex items-center gap-2 h-11 px-6 rounded-lg bg-shade-02 dark:bg-t-primary text-t-light dark:text-b-surface1 text-[14px] font-semibold hover:bg-shade-04 transition-colors shadow-sm active:scale-[0.98]"
              >
                <RiBuilding4Line size={16} /> New
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full text-left text-[14px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-s-stroke2/30 text-t-secondary text-[12px] uppercase tracking-[0.05em]">
                  <th className="px-6 py-4 font-semibold">Institute</th>
                  <th className="px-6 py-4 font-semibold">Admin Email</th>
                  <th className="px-6 py-4 font-semibold">Students</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-t-primary dark:text-t-primary font-medium">
                {/* Loading state */}
                {listLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-t-secondary">
                      <div className="flex flex-col items-center gap-3">
                        <RiLoader4Line size={24} className="animate-spin text-t-secondary" />
                        <span className="text-[13px]">Loading institutes...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Error state */}
                {!listLoading && listError && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <RiErrorWarningLine size={24} className="text-primary-03" />
                        <span className="text-[13px] text-t-secondary">
                          Failed to load institutes: {listError}
                        </span>
                        <button
                          onClick={refetch}
                          className="text-[13px] font-semibold text-t-primary underline underline-offset-2"
                        >
                          Try again
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {!listLoading && !listError && filteredInstitutes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <RiBuilding4Line size={28} className="text-t-secondary opacity-40" />
                        <p className="text-[14px] font-semibold text-t-primary">
                          {search ? "No institutes match your search" : "No institutes yet"}
                        </p>
                        <p className="text-[13px] text-t-secondary">
                          {search ? "Try a different search term" : 'Click "New" to onboard your first institute partner'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!listLoading && !listError && filteredInstitutes.map((institute) => (
                  <tr
                    key={institute.id}
                    className="border-b border-s-stroke2/20 hover:bg-b-surface1 dark:hover:bg-b-surface1/60 transition-colors group/row"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/20 flex items-center justify-center font-bold text-[14px]">
                          {institute.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[14px] truncate">{institute.name}</div>
                          <div className="text-[12px] text-t-secondary font-medium uppercase">{institute.plan}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-t-secondary text-[13px]">
                      {institute.owner_email ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {institute.student_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider ${planBadgeClass(institute.plan)}`}>
                        {institute.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider ${
                        institute.is_active
                          ? "bg-[rgba(0,166,86,0.08)] text-primary-02"
                          : "bg-[rgba(239,68,68,0.08)] text-primary-03"
                      }`}>
                        {institute.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-t-secondary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/40 hover:text-t-primary dark:hover:text-t-primary transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100">
                        <RiMore2Fill size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="relative z-10 flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between bg-b-surface2 dark:bg-b-surface2 rounded-b-[32px]">
            <div className="text-[13px] text-t-secondary font-medium">
              <span className="font-bold text-t-primary dark:text-t-primary">
                {filteredInstitutes.length}
              </span>{" "}
              {filteredInstitutes.length === 1 ? "institute" : "institutes"}
              {search ? " found" : " total"}
            </div>
          </div>
        </div>
      </main>

      {/* New Institute Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Onboard New Institute"
        maxWidth="max-w-[500px]"
      >
        <div className="flex flex-col gap-6">

          {/* Feedback banner inside modal */}
          {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
              Institute Name
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., Allen Career Institute"
              value={newInstituteData.name}
              onChange={(e) => setNewInstituteData({ ...newInstituteData, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
              Admin Email
            </label>
            <input
              type="email"
              className="input-field w-full"
              placeholder="admin@institute.com"
              value={newInstituteData.adminEmail}
              onChange={(e) => setNewInstituteData({ ...newInstituteData, adminEmail: e.target.value })}
            />
            <p className="text-[12px] text-t-secondary">
              A setup link will be sent to this email — no prior signup needed.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
              Admin Username
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., allen_admin"
              value={newInstituteData.adminUsername}
              onChange={(e) => setNewInstituteData({ ...newInstituteData, adminUsername: e.target.value })}
            />
            <p className="text-[12px] text-t-secondary">
              This will be the display name shown across the platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
                Institute Type
              </label>
              <div className="relative">
                <select
                  className="input-field w-full appearance-none pr-10"
                  value={newInstituteData.type}
                  onChange={(e) => setNewInstituteData({ ...newInstituteData, type: e.target.value })}
                >
                  <option value="jee">JEE</option>
                  <option value="neet">NEET</option>
                  <option value="both">JEE + NEET</option>
                  <option value="ssc">SSC</option>
                </select>
                <RiArrowDownSLine size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
                Price / Student (₹)
              </label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="500"
                min="0"
                value={newInstituteData.price}
                onChange={(e) => setNewInstituteData({ ...newInstituteData, price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-s-stroke2/30">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-ghost px-6"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              className={`btn btn-primary px-8 flex items-center gap-2 ${isCreating ? "opacity-70 pointer-events-none" : ""}`}
              onClick={handleCreateInstitute}
              disabled={isCreating}
            >
              {isCreating && <RiLoader4Line size={16} className="animate-spin" />}
              {isCreating ? "Provisioning..." : "Provision Institute"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── One-Time Credentials Modal ─────────────────────────────────────── */}
      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="Institute Provisioned ✓"
        maxWidth="max-w-[480px]"
      >
        {credentials && (
          <div className="flex flex-col gap-5">

            {/* Success header */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[rgba(0,166,86,0.07)] border border-[rgba(0,166,86,0.18)]">
              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-primary-02 flex items-center justify-center">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-primary-02">
                  {credentials.instituteName} has been registered.
                </div>
                <div className="text-[12px] text-t-secondary mt-0.5">
                  Share the credentials below with the institute admin so they can log in.
                </div>
              </div>
            </div>

            {/* Credential rows */}
            <div className="flex flex-col gap-3">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-t-secondary">
                  Login Email
                </label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-b-surface1 border border-s-stroke2/40 font-mono text-[13px] text-t-primary select-all">
                  {credentials.email}
                </div>
              </div>

              {/* Temp Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-t-secondary">
                  Temporary Password
                  <span className="ml-2 normal-case text-[10px] font-semibold text-primary-03 bg-[rgba(239,68,68,0.08)] px-2 py-0.5 rounded-full">
                    shown once — copy now
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center px-4 py-3 rounded-lg bg-b-surface1 border border-s-stroke2/40 font-mono text-[14px] font-bold text-t-primary select-all tracking-widest">
                    {credentials.password}
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.password)}
                    className={`shrink-0 h-[46px] px-4 rounded-lg border transition-all text-[12px] font-semibold active:scale-95 ${
                      copied
                        ? "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02"
                        : "bg-b-surface2 border-s-stroke2/40 text-t-secondary hover:text-t-primary hover:border-s-highlight"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning note */}
            <p className="text-[12px] text-t-secondary leading-relaxed">
              <span className="font-semibold text-t-primary">This password will not be shown again.</span>{" "}
              The institute admin should log in and change their password immediately from their profile settings.
            </p>

            <div className="flex justify-end pt-2 border-t border-s-stroke2/30">
              <button
                onClick={() => setCredentials(null)}
                className="btn btn-primary px-8"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
