"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { PageWrapper } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import {
  RiTeamLine,
  RiGroupLine,
  RiBankCardLine,
  RiArrowRightUpLine,
  RiMore2Fill,
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightLine,
  RiStarFill,
  RiCloseLine,
  RiLoaderLine,
  RiCheckLine,
  RiAlertLine,
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useBatches } from "@/lib/hooks/useBatches";
import { apiClient } from "@/lib/api.client";

// Exam options — codes match the `exams` table in Supabase
const EXAM_OPTIONS = {
  "jee-neet": [
    { id: "jee-main",      label: "JEE Main" },
    { id: "jee-advanced",  label: "JEE Advanced" },
    { id: "neet-ug",       label: "NEET UG" },
  ],
  "ssc": [
    { id: "ssc-cgl",  label: "SSC CGL" },
    { id: "ssc-chsl", label: "SSC CHSL" },
    { id: "ssc-mts",  label: "SSC MTS" },
  ],
  "hybrid": [
    { id: "jee-main",     label: "JEE Main" },
    { id: "jee-advanced", label: "JEE Advanced" },
    { id: "neet-ug",      label: "NEET UG" },
    { id: "ssc-cgl",      label: "SSC CGL" },
  ],
};

export default function InstituteDashboardPage() {
  const router = useRouter();
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    name: "",
    exam: "",
    max_students: "",
    max_teachers: "",
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const { user, session } = useAuth();
  const { batches, loading: batchesLoading, createBatch } = useBatches();

  // ── Real institute data ──────────────────────────────────────────────────
  const [institute, setInstitute] = useState<any>(null);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [realStudentCount, setRealStudentCount] = useState(0);

  useEffect(() => {
    if (!session?.access_token) return;
    const fetchInstitute = async () => {
      try {
        const res = await apiClient.get("/api/v1/institutes/me", session.access_token);
        if (res.success) {
           setInstitute(res.data.institute);
           setRecentStudents(res.data.recentStudents || []);
        }
      } catch (e) { console.error("[Institute]", e); }
    };
    fetchInstitute();
  }, [session?.access_token]);

  // Derived stats from real batch data
  const activeBatchesCount = batches.length;
  const totalStudentsCount = realStudentCount || batches.reduce((sum, b) => sum + (b.max_students ?? 0), 0);

  const instituteOverview = {
    instituteName: institute?.name ?? user?.name ?? "Institute",
    name: user?.name ?? "Admin",
    instituteType: institute?.type ?? "hybrid",
    studentsCount: totalStudentsCount,
    batchesCount: activeBatchesCount,
    plan: institute?.subscription_plan ?? "Free",
  };

  const availableExams =
    EXAM_OPTIONS[instituteOverview.instituteType as keyof typeof EXAM_OPTIONS] ||
    EXAM_OPTIONS["hybrid"];

  const handleOpenBatchModal = () => {
    setNewBatchData({ name: "", exam: "", max_students: "", max_teachers: "" });
    setBatchFeedback(null);
    setIsBatchModalOpen(true);
  };

  const handleCreateBatch = async () => {
    if (!newBatchData.name || !newBatchData.exam) return;
    setBatchSubmitting(true);
    setBatchFeedback(null);
    const result = await createBatch({
      name: newBatchData.name,
      exam: newBatchData.exam,
      max_students: newBatchData.max_students ? Number(newBatchData.max_students) : null,
      max_teachers: newBatchData.max_teachers ? Number(newBatchData.max_teachers) : null,
    });
    setBatchSubmitting(false);
    if (result.success) {
      setBatchFeedback({ ok: true, msg: "Batch created!" });
      setTimeout(() => {
        setIsBatchModalOpen(false);
        router.push("/institute/batches");
      }, 800);
    } else {
      setBatchFeedback({ ok: false, msg: result.message });
    }
  };

  const availableExamsForModal = availableExams;

  return (
    <>
      <Navbar
        title={`${instituteOverview.instituteName} Dashboard`}
        subtitle={`Welcome back, ${instituteOverview.name}. Here is your institute overview.`}
        breadcrumbs="Dashboard"
      >
        <div className="flex flex-row items-center gap-3 w-full md:w-auto">
          <button onClick={handleOpenBatchModal} className="flex-1 md:flex-none flex flex-row justify-center items-center px-4 md:px-6 h-12 border border-s-stroke2 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary text-[13px] sm:text-sm font-sans font-semibold rounded-[10px] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
            <RiAddLine size={18} className="mr-1 md:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Create New Batch</span>
            <span className="sm:hidden">New Batch</span>
          </button>

          {/* Schedule Batch Test (Gradient) */}
          <Link
            href="/institute/tests/create"
            className="flex-1 md:flex-none flex flex-row justify-center items-center px-4 md:px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-[13px] sm:text-sm font-sans font-semibold rounded-[10px] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer no-underline whitespace-nowrap overflow-hidden text-ellipsis"
          >
            <RiAddLine size={18} className="mr-1 md:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Schedule Batch Test</span>
            <span className="sm:hidden">Schedule Test</span>
          </Link>
        </div>
      </Navbar>
      
      <PageWrapper>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 w-full">
          <MetricCard
            icon={<RiGroupLine size={20} />}
            label="Total Students"
            value={instituteOverview.studentsCount}
            badge="+12"
            badgeLabel="this month"
          />
          <MetricCard
            icon={<RiTeamLine size={20} />}
            label="Active Batches"
            value={instituteOverview.batchesCount}
            badge="+2"
            badgeLabel="completing soon"
          />
          <MetricCard
            icon={<RiBankCardLine size={20} />}
            label="Subscription"
            value={instituteOverview.plan}
            badge="Active"
            badgeLabel="Renews Aug 15"
            className="col-span-2 lg:col-span-1"
          />
        </div>

        {/* ── Main Content Grid (Recent Batches + Top Students) ── */}
        <div className="grid gap-6 lg:grid-cols-2 items-start w-full">

          {/* Recent Batches Section */}
          <SectionCard
            title="Recent Batches"
            className="w-full min-h-[580px] min-w-0"
            headerRight={
              <Link 
                href="/institute/batches" 
                className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
              >
                <span>View All</span>
                <RiArrowRightLine size={16} />
              </Link>
            }
          >

            {/* List Rows */}
            <div className="flex flex-col gap-2 w-full min-w-0">
              {batchesLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[88px] rounded-[10px] bg-b-surface1 animate-pulse" />
                  ))}
                </div>
              ) : batches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[14px] font-sans text-t-secondary">No recent batches.</p>
                </div>
              ) : (
                batches.slice(0, 5).map((batch, index) => {
                  const isHoverItem = index === 1;

                  return (
                    <div
                      key={batch.id}
                      className={`group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 rounded-[16px] transition-all w-full h-[76px] sm:h-[88px] overflow-hidden ${
                        isHoverItem
                          ? "bg-b-surface1 dark:bg-b-surface1/40 shadow-[inset_0px_0px_0px_3px_#FFFFFF] dark:shadow-[inset_0px_0px_0px_3px_rgba(255,255,255,0.05)] border border-s-stroke2/20"
                          : "bg-transparent border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 hover:bg-b-surface1 dark:hover:bg-b-surface1/40"
                      }`}
                    >
                      {/* Left */}
                      <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                        <div className="flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] bg-b-surface1 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold">
                          <RiTeamLine size={24} className="text-t-secondary scale-75 sm:scale-100" />
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                            {batch.name}
                          </span>
                          <span className="text-[11px] sm:text-xs text-t-secondary dark:text-t-tertiary mt-0.5 uppercase tracking-wide truncate">
                            {batch.exam} · {batch.max_students ?? 0} Students
                          </span>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-row items-center gap-2 sm:gap-3 shrink-0">
                        <div className="flex justify-end">
                          <span className="px-2 sm:px-3 py-1 sm:py-1.5 border rounded-[10px] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-primary-02/5 border-primary-02/15 text-primary-02">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </SectionCard>

          {/* Top Students Section */}
          <SectionCard
            title="Top Performing Students"
            className="w-full min-h-[580px] min-w-0"
            headerRight={
              <Link 
                href="/institute/students" 
                className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
              >
                <span>View Directory</span>
                <RiArrowRightLine size={16} />
              </Link>
            }
          >

            {/* List Rows */}
            <div className="flex flex-col gap-2 w-full min-w-0">
              {recentStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[120px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-[16px]">
                  <RiTeamLine size={24} className="text-t-secondary mb-2" />
                  <span className="text-sm text-t-secondary">No students added yet.</span>
                </div>
              ) : (
                recentStudents.slice(0, 5).map((student: any, index: number) => {
                  return (
                    <div
                      key={student.id}
                      className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all h-[76px] sm:h-[88px] overflow-hidden"
                    >
                      <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                        <div className="flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] bg-primary-01/10 border border-primary-01/20 text-primary-01 shrink-0">
                          <RiTeamLine size={24} className="scale-75 sm:scale-100" />
                        </div>
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                            {student.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 truncate">
                            <span className="font-sans text-[11px] sm:text-[12px] font-normal text-t-secondary truncate">{student.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row items-center gap-2 sm:gap-3 shrink-0">
                        <span className="hidden sm:inline px-2 py-0.5 sm:px-3 sm:py-[2px] bg-[rgba(123,123,123,0.05)] border-[1.5px] border-s-stroke2/40 text-t-secondary rounded-[10px] text-[10px] sm:text-[12px] font-normal tracking-[0.004em] leading-[160%]">
                          Added {new Date(student.created_at).toLocaleDateString()}
                        </span>
                        <span className="sm:hidden text-t-secondary text-[11px]">
                          {new Date(student.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </SectionCard>

        </div>

      </PageWrapper>

      {/* Create Batch Modal */}
      <Modal
        open={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Create New Batch"
        subtitle={`Institute Type: ${instituteOverview.instituteType.toUpperCase()}`}
      >
        <div className="flex flex-col gap-5">
          {/* Batch Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Batch Name</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., Target 2026 Morning"
              value={newBatchData.name}
              onChange={(e) => setNewBatchData({ ...newBatchData, name: e.target.value })}
            />
          </div>

          {/* Target Exam */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target Exam</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={newBatchData.exam}
                onChange={(e) => setNewBatchData({ ...newBatchData, exam: e.target.value })}
              >
                <option value="" disabled>Select Exam...</option>
                {availableExamsForModal.map(exam => (
                  <option key={exam.id} value={exam.id}>{exam.label}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
            <p className="text-xs text-t-secondary mt-2">
              Showing exams based on your institute type ({instituteOverview.instituteType}).
            </p>
          </div>

          {/* Students + Faculty row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Total Students</label>
              <input
                type="number"
                min="1"
                className="input-field w-full"
                placeholder="e.g., 60"
                value={newBatchData.max_students}
                onChange={(e) => setNewBatchData({ ...newBatchData, max_students: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Total Faculty</label>
              <input
                type="number"
                min="1"
                className="input-field w-full"
                placeholder="e.g., 4"
                value={newBatchData.max_teachers}
                onChange={(e) => setNewBatchData({ ...newBatchData, max_teachers: e.target.value })}
              />
            </div>
          </div>

          {/* Feedback */}
          {batchFeedback && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-[10px] border ${
              batchFeedback.ok
                ? "bg-primary-02/5 border-primary-02/20 text-primary-02"
                : "bg-primary-03/5 border-primary-03/20 text-primary-03"
            }`}>
              {batchFeedback.ok
                ? <RiCheckLine size={16} />
                : <RiAlertLine size={16} />}
              {batchFeedback.msg}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3 pt-4 border-t border-s-stroke2/50">
            <button
              onClick={() => setIsBatchModalOpen(false)}
              className="btn btn-ghost px-5"
              disabled={batchSubmitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary px-6 shadow-md flex items-center gap-2"
              onClick={handleCreateBatch}
              disabled={!newBatchData.name || !newBatchData.exam || batchSubmitting}
            >
              {batchSubmitting && <RiLoaderLine size={16} className="animate-spin" />}
              {batchSubmitting ? "Creating..." : "Create Batch"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
