"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
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
  RiMailLine,
  RiUserStarLine
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
    case "enterprise": return "bg-[rgba(94,92,230,0.08)] text-[#5E5CE6] border border-[#5E5CE6]/20";
    case "pro":        return "bg-[rgba(10,132,255,0.08)] text-[#0A84FF] border border-[#0A84FF]/20";
    default:           return "bg-b-surface1 dark:bg-b-surface1 text-t-secondary border border-s-stroke2/40";
  }
}

// ─── Inline feedback banner ───────────────────────────────────────────────────

function FeedbackBanner({ type, message }: { type: "success" | "error"; message: string }) {
  if (!message) return null;
  const isSuccess = type === "success";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-[10px] text-[13px] font-medium border ${
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
        <MetricGrid cols={4} className="mb-8">
          <MetricCard
            label="Total Institutes"
            value={statsLoading ? "—" : (stats?.totalInstitutes ?? 0)}
            badge={statsLoading ? "" : `+${stats?.newInstitutesThisWeek ?? 0}`}
            badgeLabel="this week"
          />
          <MetricCard
            label="Active Students"
            value={statsLoading ? "—" : formatStudentCount(stats?.totalStudents ?? 0)}
            badge={statsLoading ? "" : `+${stats?.newStudentsThisWeek ?? 0}`}
            badgeLabel="this week"
          />
          <MetricCard
            label="Enterprise Plans"
            value={statsLoading ? "—" : (stats?.enterprisePlans ?? 0)}
            badge=""
            badgeLabel="active clients"
          />
          <MetricCard
            label="Est. MRR"
            value={statsLoading ? "—" : formatMRR(stats?.estimatedMRR ?? 0)}
            badge=""
            badgeLabel="price × institutes"
          />
        </MetricGrid>

        {/* Data List container */}
        <SectionCard
          title="Institute Partners"
          headerRight={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-[300px]">
                <RiSearchLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
                <input
                  type="text"
                  placeholder="Search institutes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-sm font-sans text-t-primary placeholder:text-t-secondary focus:border-t-primary outline-none transition-colors"
                />
              </div>

              <button className="flex items-center gap-2 h-11 px-5 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-semibold text-t-primary dark:text-t-primary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                Filter by <RiFilter3Line size={16} className="text-t-secondary" />
              </button>
              <button
                onClick={openModal}
                className="btn btn-primary h-11 px-6 rounded-[10px]"
              >
                <RiBuilding4Line size={16} className="mr-1" /> New Institute
              </button>
            </div>
          }
        >
          <div className="relative z-10 flex flex-col gap-3 mt-4">
            
            {/* Header row (hidden on mobile, visible md+) */}
            <div className="hidden md:flex flex-row items-center justify-between px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
              <div className="w-[300px]">Institute</div>
              <div className="w-[200px]">Admin Email</div>
              <div className="w-[120px]">Students</div>
              <div className="w-[120px]">Plan</div>
              <div className="w-[100px] text-right">Status</div>
              <div className="w-[60px] text-right">Actions</div>
            </div>

            {/* Loading state */}
            {listLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-t-secondary gap-3">
                <RiLoader4Line size={24} className="animate-spin text-t-secondary" />
                <span className="text-sm">Loading institutes...</span>
              </div>
            )}

            {/* Error state */}
            {!listLoading && listError && (
              <div className="flex flex-col items-center justify-center py-16 text-t-secondary gap-3">
                <RiErrorWarningLine size={24} className="text-primary-03" />
                <span className="text-sm">Failed to load institutes: {listError}</span>
                <button onClick={refetch} className="text-sm font-semibold text-t-primary underline">Try again</button>
              </div>
            )}

            {/* Empty state */}
            {!listLoading && !listError && filteredInstitutes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-t-secondary gap-3">
                <RiBuilding4Line size={28} className="text-t-secondary opacity-40" />
                <p className="text-sm font-semibold text-t-primary">
                  {search ? "No institutes match your search" : "No institutes yet"}
                </p>
                <p className="text-sm">
                  {search ? "Try a different search term" : 'Click "New" to onboard your first institute partner'}
                </p>
              </div>
            )}

            {/* Data rows */}
            {!listLoading && !listError && filteredInstitutes.map((institute) => (
              <div
                key={institute.id}
                className="group/item relative flex flex-col md:flex-row md:items-center justify-between p-4 md:px-6 gap-4 md:gap-8 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer"
              >
                {/* Institute Name */}
                <div className="w-full md:w-[300px] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[12px] bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 flex items-center justify-center font-bold text-lg text-t-primary shadow-sm shrink-0">
                    {institute.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-sans font-semibold text-base text-t-primary truncate">{institute.name}</span>
                    <span className="text-xs text-t-secondary font-medium uppercase mt-0.5">{institute.plan}</span>
                  </div>
                </div>

                {/* Email */}
                <div className="w-full md:w-[200px] flex items-center gap-2 text-t-secondary">
                  <RiMailLine size={16} className="text-t-tertiary hidden md:block" />
                  <span className="text-sm truncate">{institute.owner_email ?? "—"}</span>
                </div>

                {/* Students */}
                <div className="w-full md:w-[120px] flex items-center gap-2">
                  <RiUserStarLine size={16} className="text-t-tertiary hidden md:block" />
                  <span className="font-sans font-bold text-t-primary text-base">{institute.student_count.toLocaleString()}</span>
                </div>

                {/* Plan Badge */}
                <div className="w-full md:w-[120px] flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-[10px] text-[11px] font-bold uppercase tracking-wider ${planBadgeClass(institute.plan)}`}>
                    {institute.plan}
                  </span>
                </div>

                {/* Status */}
                <div className="w-full md:w-[100px] flex items-center md:justify-end">
                  <span className={`inline-flex items-center px-3 py-1 rounded-[10px] text-[11px] font-bold uppercase tracking-wider border ${
                    institute.is_active
                      ? "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02"
                      : "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03"
                  }`}>
                    {institute.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Actions */}
                <div className="w-full md:w-[60px] flex items-center md:justify-end shrink-0">
                  <button className="p-2 rounded-[10px] text-t-secondary hover:bg-s-stroke2 hover:text-t-primary transition-colors opacity-100 md:opacity-0 md:group-hover/item:opacity-100 active:scale-95">
                    <RiMore2Fill size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-s-stroke2/30 flex justify-between items-center text-sm font-medium text-t-secondary px-2">
            <div>
              <span className="font-bold text-t-primary">{filteredInstitutes.length}</span> {filteredInstitutes.length === 1 ? "institute" : "institutes"}{search ? " found" : " total"}
            </div>
          </div>
        </SectionCard>
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
            <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] bg-[rgba(0,166,86,0.07)] border border-[rgba(0,166,86,0.18)]">
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
                <div className="flex items-center gap-2 px-4 py-3 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 font-mono text-[13px] text-t-primary select-all">
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
                  <div className="flex-1 flex items-center px-4 py-3 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 font-mono text-[14px] font-bold text-t-primary select-all tracking-widest">
                    {credentials.password}
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.password)}
                    className={`shrink-0 h-[46px] px-4 rounded-[10px] border transition-all text-[12px] font-semibold active:scale-95 ${
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
