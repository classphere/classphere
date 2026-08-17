"use client";

import Link from "next/link";
import { useState } from "react";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { PageWrapper } from "@/components/ui";
import { CreateBatchModal } from "@/components/institute/CreateBatchModal";
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

const EXAM_LABELS: Record<string, string> = {
  "jee-main":          "JEE Main",
  "jee-advanced":      "JEE Advanced",
  "jee-main-advanced": "JEE Main + Advanced",
  "neet-ug":           "NEET UG",
};

export default function InstituteDashboardPage() {
  const router = useRouter();
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const { user, session } = useAuth();
  const { batches, loading: batchesLoading, createBatch } = useBatches();

  // ── Real institute data ──────────────────────────────────────────────────

  const { data: instituteData } = useApiQuery<{ institute: any; topPerformers?: any[] }>("/api/v1/institutes/me");
  const { data: subscription, isPending: subscriptionLoading } =
    useApiQuery<{ status?: string; current_period_end?: string | null }>("/api/v1/institutes/me/subscription");
  const institute = instituteData?.institute ?? null;
  const topPerformers = instituteData?.topPerformers ?? [];

  // Derived stats from real batch data.
  //
  // This read a realStudentCount state that was declared and never set, so it
  // was always 0 and always fell through to the second half — which sums
  // max_students, a capacity limit rather than a headcount. The card therefore
  // showed 0 for an institute with students, and would have shown the total
  // capacity for one that had set limits. Summed from the counts the batches
  // endpoint now returns.
  const activeBatchesCount = batches.length;
  const totalStudentsCount = batches.reduce((sum, b) => sum + (b.student_count ?? 0), 0);

  const instituteOverview = {
    instituteName: institute?.name ?? user?.name ?? "Institute",
    name: user?.name ?? "Admin",
    instituteType: institute?.type ?? "exam preparation",
    studentsCount: totalStudentsCount,
    batchesCount: activeBatchesCount,
  };

  const isActiveTrial = subscription?.status === "trialing" &&
    (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > Date.now());
  const accountStatus = subscriptionLoading ? "—" : isActiveTrial ? "Trial" : subscription?.status === "active" ? "Active" : "—";
  const trialEndsLabel = isActiveTrial && subscription?.current_period_end
    ? `Ends ${new Date(subscription.current_period_end).toLocaleDateString()}`
    : undefined;

  const availableExams: { id: string; label: string }[] = (institute?.enabled_exam_codes ?? ["jee-main", "jee-advanced", "neet-ug"])
    .map((id: string) => ({ id, label: EXAM_LABELS[id] }))
    .filter((exam: { id: string; label?: string }): exam is { id: string; label: string } => Boolean(exam.label));

  // The shared modal owns its own form state and clears it on close.
  const handleOpenBatchModal = () => setIsBatchModalOpen(true);

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
            className="btn btn-primary flex-1 md:flex-none px-4 md:px-6 h-12 text-[13px] sm:text-sm no-underline whitespace-nowrap overflow-hidden text-ellipsis"
          >
            <RiAddLine size={18} className="mr-1 md:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Schedule Batch Test</span>
            <span className="sm:hidden">Schedule Test</span>
          </Link>
        </div>
      </Navbar>
      
      <PageWrapper>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3 mb-3 w-full">
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
            label="Account status"
            value={accountStatus}
            badgeLabel={trialEndsLabel}
            className="col-span-2 lg:col-span-1"
          />
        </div>

        {/* ── Main Content Grid (Recent Batches + Top Students) ── */}
        <div className="grid gap-3 lg:grid-cols-2 items-start w-full">

          {/* Recent Batches Section */}
          <SectionCard
            title="Batches"
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
                batches.slice(0, 5).map((batch) => {
                  return (
                    <div
                      key={batch.id}
                      className="group/item relative flex flex-row items-center p-2.5 sm:p-3 gap-3 sm:gap-4 rounded-[16px] border border-transparent transition-all w-full h-[76px] sm:h-[88px] overflow-hidden hover:border-s-stroke2/50 hover:bg-b-surface2/70"
                    >
                      {/* Left */}
                      <div className="flex flex-row items-center gap-3 sm:gap-3 flex-1 min-w-0">
                        <div className="flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] bg-b-surface1 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold">
                          <RiTeamLine size={24} className="text-t-secondary scale-75 sm:scale-100" />
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                            {batch.name}
                          </span>
                          <span className="text-[11px] sm:text-xs text-t-secondary dark:text-t-tertiary mt-0.5 uppercase tracking-wide truncate">
                            {batch.exam} · {batch.student_count ?? 0} Students
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
              {topPerformers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[120px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-[16px]">
                  <RiTeamLine size={24} className="text-t-secondary mb-2" />
                  <span className="text-sm text-t-secondary">Top performers appear after students complete at least 3 tests.</span>
                </div>
              ) : (
                topPerformers.map((student: any) => {
                  return (
                    <div
                      key={student.id}
                      className="group/item relative flex flex-row items-center p-2.5 sm:p-3 gap-3 sm:gap-4 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all h-[76px] sm:h-[88px] overflow-hidden"
                    >
                      <div className="flex flex-row items-center gap-3 sm:gap-3 flex-1 min-w-0">
                        <div className="flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] bg-primary-01/10 border border-primary-01/20 text-primary-01 shrink-0">
                          <RiTeamLine size={24} className="scale-75 sm:scale-100" />
                        </div>
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                            {student.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 truncate">
                            <span className="font-sans text-[11px] sm:text-[12px] font-normal text-t-secondary truncate">
                              {student.average_percentage}% average · {student.tests_taken} tests · {student.consistency}% consistency
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row items-center gap-2 sm:gap-3 shrink-0">
                        <span className="hidden sm:inline px-2 py-0.5 sm:px-3 sm:py-[2px] bg-[rgba(123,123,123,0.05)] border-[1.5px] border-s-stroke2/40 text-t-secondary rounded-[10px] text-[10px] sm:text-[12px] font-normal tracking-[0.004em] leading-[160%]">
                          {student.trend > 2 ? `↑ ${student.trend}% improving` : student.trend < -2 ? `↓ ${Math.abs(student.trend)}% recent dip` : "Stable performance"}
                        </span>
                        <span className="sm:hidden text-t-secondary text-[11px]">
                          {student.average_percentage}%
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

      <CreateBatchModal
        open={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        availableExams={availableExams}
        onCreate={createBatch}
        onCreated={(batchId) => {
          setIsBatchModalOpen(false);
          router.push(`/institute/students?batch=${batchId}`);
        }}
      />
    </>
  );
}
