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
    case "active":     return "bg-[rgba(10,132,255,0.08)] text-[#0A84FF] border border-[#0A84FF]/20";
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
  const { 
    institutes, 
    loading: listLoading, 
    error: listError, 
    createInstitute, 
    uploadImage, 
    refetch,
    updateInstitute,
    deleteInstitute
  } = useInstitutes();
  const { stats, loading: statsLoading, refetch: refetchStats } = useSuperadminStats();

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInstituteData, setNewInstituteData] = useState({
    name: "",
    adminEmail: "",
    adminUsername: "",
    preferredSubdomain: "",
    trialMonths: 2,
    logoUrl: "",
    enabledExamCodes: ["jee-main", "jee-advanced", "neet-ug"],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setFeedback(null);
    try {
      const url = await uploadImage(file);
      setNewInstituteData((prev) => ({ ...prev, logoUrl: url }));
      setFeedback({ type: "success", message: "Logo uploaded successfully to Cloudflare R2!" });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message ?? "Logo upload failed" });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Credentials modal (shown once after successful provisioning)
  const [credentials, setCredentials] = useState<{ email: string; password: string; instituteName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setActiveDropdownId(null);
    const res = await updateInstitute(id, { is_active: !currentActive });
    if (res.success) {
      refetchStats(); // reload stats card
    } else {
      alert(res.message);
    }
  };

  const handleChangePlan = async (id: string, newPlan: string) => {
    setActiveDropdownId(null);
    const res = await updateInstitute(id, { plan: newPlan });
    if (res.success) {
      refetchStats();
    } else {
      alert(res.message);
    }
  };

  const handleDeleteInstitute = async (id: string, name: string) => {
    setActiveDropdownId(null);
    if (!confirm(`Are you sure you want to permanently delete/suspend "${name}"? This action is irreversible.`)) return;
    const res = await deleteInstitute(id);
    if (res.success) {
      refetchStats();
    } else {
      alert(res.message);
    }
  };

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
    if (!newInstituteData.name || !newInstituteData.adminEmail || !newInstituteData.adminUsername || newInstituteData.enabledExamCodes.length === 0) {
      setFeedback({ type: "error", message: "Provide the institute details and select at least one examination." });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    const result = await createInstitute(newInstituteData);

    if (result.success) {
      setIsCreateModalOpen(false);
      setNewInstituteData({ name: "", adminEmail: "", adminUsername: "", preferredSubdomain: "", trialMonths: 2, logoUrl: "", enabledExamCodes: ["jee-main", "jee-advanced", "neet-ug"] });
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
    setNewInstituteData({ name: "", adminEmail: "", adminUsername: "", preferredSubdomain: "", trialMonths: 2, logoUrl: "", enabledExamCodes: ["jee-main", "jee-advanced", "neet-ug"] });
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
                className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[80px] sm:h-[88px]"
              >
                {/* Institute Name & Email */}
                <div className="flex flex-row items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="size-10 sm:w-12 sm:h-12 rounded-[12px] bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 flex items-center justify-center font-bold text-base sm:text-lg text-t-primary shadow-sm shrink-0">
                    {institute.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex flex-col justify-center w-full md:w-[280px]">
                    <span className="font-sans font-semibold text-[14px] sm:text-base text-t-primary truncate">{institute.name}</span>
                    <span className="text-[11px] sm:text-[13px] text-t-secondary font-medium mt-0.5 truncate flex items-center gap-1">
                      <RiMailLine size={12} className="hidden sm:inline" />
                      {institute.owner_email ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Students */}
                <div className="hidden md:flex flex-row items-center gap-2 w-[120px] shrink-0">
                  <RiUserStarLine size={16} className="text-t-tertiary" />
                  <span className="font-sans font-bold text-t-primary text-base">{institute.student_count.toLocaleString()}</span>
                </div>

                {/* Badges (Stacked on mobile, side-by-side on desktop) */}
                <div className="flex flex-col md:flex-row items-end md:items-center justify-center gap-1 md:gap-4 shrink-0 md:w-[220px]">
                  <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-[10px] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider ${planBadgeClass(institute.plan)}`}>
                    {institute.plan}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-[10px] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border ${
                    institute.is_active
                      ? "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02"
                      : "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03"
                  }`}>
                    {institute.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Actions */}
                <div className="relative flex items-center justify-end shrink-0 pl-1 sm:pl-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownId(activeDropdownId === institute.id ? null : institute.id);
                    }}
                    className="p-2 rounded-[10px] text-t-secondary hover:bg-s-stroke2 hover:text-t-primary transition-colors opacity-100 md:opacity-0 md:group-hover/item:opacity-100 active:scale-95"
                  >
                    <RiMore2Fill size={20} />
                  </button>
                  
                  {activeDropdownId === institute.id && (
                    <div className="absolute right-0 top-11 z-50 w-48 bg-b-surface1 dark:bg-[#1a1a1a] border border-s-stroke2/60 rounded-[12px] shadow-lg py-2 text-left">
                      <button 
                        onClick={() => handleToggleActive(institute.id, institute.is_active)}
                        className="w-full px-4 py-2 text-xs font-semibold text-t-primary hover:bg-s-stroke2/30 transition-colors text-left"
                      >
                        {institute.is_active ? "Deactivate Partner" : "Activate Partner"}
                      </button>
                      
                      <div className="h-px bg-s-stroke2/30 my-1" />
                      
                      <div className="px-4 py-1 text-[10px] uppercase font-bold text-t-secondary">Change Subscription Tier</div>
                      {["free", "trial", "active", "enterprise"].map((plan) => (
                        <button
                          key={plan}
                          onClick={() => handleChangePlan(institute.id, plan)}
                          className={`w-full px-4 py-1.5 text-xs text-t-primary hover:bg-s-stroke2/30 transition-colors capitalize text-left block ${
                            institute.plan.toLowerCase() === plan ? 'font-bold text-[#0A84FF]' : ''
                          }`}
                        >
                          {plan}
                        </button>
                      ))}

                      <div className="h-px bg-s-stroke2/30 my-1" />

                      <button 
                        onClick={() => handleDeleteInstitute(institute.id, institute.name)}
                        className="w-full px-4 py-2 text-xs font-semibold text-primary-03 hover:bg-[rgba(239,68,68,0.1)] transition-colors text-left"
                      >
                        Delete Partner
                      </button>
                    </div>
                  )}
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
        scrollable
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
              Preferred subdomain <span className="normal-case font-medium">(optional)</span>
            </label>
            <div className="flex overflow-hidden rounded-[10px] border border-s-stroke2/60 bg-b-surface1 focus-within:ring-2 focus-within:ring-primary-01/20">
              <input
                type="text"
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[14px] text-t-primary outline-none"
                placeholder="allen"
                value={newInstituteData.preferredSubdomain}
                onChange={(e) => setNewInstituteData({
                  ...newInstituteData,
                  preferredSubdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                })}
              />
              <span className="flex shrink-0 items-center border-l border-s-stroke2/60 px-3 text-[13px] text-t-secondary">
                .classphere.com
              </span>
            </div>
            <p className="text-[12px] text-t-secondary">
              Lowercase letters, numbers, and hyphens only. Leave blank to generate one from the institute name.
            </p>
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

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
              Institute Logo
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
                id="logo-file-input"
              />
              <label
                htmlFor="logo-file-input"
                className="flex items-center justify-center h-11 px-5 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 text-[13px] font-semibold text-t-primary hover:bg-s-stroke2/20 transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-50"
              >
                {uploadingLogo ? (
                  <span className="flex items-center gap-2">
                    <RiLoader4Line size={16} className="animate-spin text-t-secondary" />
                    Uploading to R2...
                  </span>
                ) : (
                  "Select Image File"
                )}
              </label>
              {newInstituteData.logoUrl && (
                <div className="flex items-center gap-2 max-w-[200px] overflow-hidden truncate bg-[rgba(0,166,86,0.07)] text-primary-02 border border-[rgba(0,166,86,0.18)] px-3 py-1.5 rounded-[8px] text-[12px] font-semibold">
                  <RiCheckboxCircleLine size={14} className="shrink-0" />
                  Uploaded
                </div>
              )}
            </div>
            <p className="text-[12px] text-t-secondary">
              Select an image from your terminal to automatically upload to Cloudflare R2 storage.
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
                  value="trial"
                  disabled
                >
                  <option value="trial">Trial access only</option>
                </select>
                <RiArrowDownSLine size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
                Price / Student (₹)
              </label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="Billing not enabled"
                value=""
                readOnly
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
              Enabled examinations
            </label>
            <p className="text-[12px] text-t-secondary">The institute admin can create batches only for these examinations.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "jee-main",          label: "JEE Main" },
                { id: "jee-advanced",      label: "JEE Advanced" },
                { id: "jee-main-advanced", label: "JEE Main + Advanced" },
                { id: "neet-ug",           label: "NEET UG" },
              ].map((exam) => {
                const checked = newInstituteData.enabledExamCodes.includes(exam.id);
                return (
                  <label key={exam.id} className="flex items-center gap-2 rounded-[10px] border border-s-stroke2/50 bg-b-surface2/60 px-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setNewInstituteData((current) => ({
                        ...current,
                        enabledExamCodes: checked
                          ? current.enabledExamCodes.filter((code) => code !== exam.id)
                          : [...current.enabledExamCodes, exam.id],
                      }))}
                    />
                    <span className="text-sm font-semibold text-t-primary">{exam.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 bg-b-surface2/50 rounded-[10px] border border-s-stroke2/50">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-s-stroke2 text-primary-01 focus:ring-primary-01 bg-white"
                checked
                readOnly
              />
              <span className="text-[14px] font-semibold text-t-primary">Offer Free Trial</span>
            </label>

            {true && (
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[13px] font-medium text-t-secondary uppercase tracking-[0.02em]">
                  Trial Duration (Months)
                </label>
                <input
                  type="number"
                  className="input-field w-full"
                  placeholder="2"
                  min="1"
                  max="24"
                  value={newInstituteData.trialMonths}
                  onChange={(e) => setNewInstituteData({ ...newInstituteData, trialMonths: Number(e.target.value) })}
                />
              </div>
            )}
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
