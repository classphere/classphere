"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import {
  SectionCard,
  MetricCard,
  MetricGrid,
  EmptyState,
  PageWrapper,
  Card,
} from "@/components/ui";

import {
  RiFileListLine,
  RiTimeLine,
  RiCheckLine,
  RiAlertLine,
  RiLoader4Line,
  RiArrowRightLine,
} from "@remixicon/react";

type StudentDPP = {
  studentDppId: string;
  dppId: string;
  title: string;
  subject?: string;
  chapter?: string;
  totalQuestions: number;
  dueDate: string | null;
  status: "pending" | "late" | "submitted";
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  submittedAt: string | null;
};

const STATUS_CONFIG = {
  late: { label: "Overdue", className: "border-primary-03/20 bg-primary-03/10 text-primary-03" },
  pending: { label: "Pending", className: "border-primary-05/20 bg-primary-05/10 text-primary-05" },
  submitted: { label: "Submitted", className: "border-primary-02/20 bg-primary-02/10 text-primary-02" },
};

function DPPCard({ dpp }: { dpp: StudentDPP }) {
  const cfg = STATUS_CONFIG[dpp.status] ?? STATUS_CONFIG.pending;

  return (
    <Card
      variant="default"
      padding="default"
      className="group hover:-translate-y-1 hover:shadow-depth transition-all duration-200 select-none"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-sans font-bold px-2 py-0.5 border rounded-[6px] uppercase tracking-wider ${cfg.className}`}>
            {cfg.label}
          </span>
          {dpp.subject && (
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 text-t-secondary rounded-[6px] uppercase tracking-wider">
              {dpp.subject}
            </span>
          )}
        </div>

        <div>
          <h3 className="font-sans font-semibold text-[16px] tracking-[-0.01em] text-t-primary leading-snug">
            {dpp.title}
          </h3>
          {dpp.chapter && (
            <p className="text-[13px] font-sans text-t-secondary mt-0.5">{dpp.chapter}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[12px] font-sans text-t-secondary">
          <span className="flex items-center gap-1">
            <RiFileListLine size={13} />
            {dpp.totalQuestions} questions
          </span>
          {dpp.dueDate && dpp.status !== "submitted" && (
            <span className="flex items-center gap-1">
              <RiTimeLine size={13} />
              Due: {new Date(dpp.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {dpp.status === "submitted" && dpp.percentage !== null && (
            <span className="flex items-center gap-1 font-bold text-t-primary">
              Score: {dpp.score}/{dpp.maxScore} ({dpp.percentage}%)
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-1">
          {dpp.status !== "submitted" ? (
            <Link
              href={`/student/dpps/take/${dpp.dppId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-sans font-semibold bg-[#161616] text-white hover:bg-[#333] transition-colors border border-[#333]"
            >
              Attempt DPP
              <RiArrowRightLine size={14} />
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-sans font-semibold border border-primary-02/20 bg-primary-02/10 text-primary-02">
              <RiCheckLine size={14} />
              Completed
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AssignmentsPage() {
  const { session } = useAuth();
  const [dpps, setDpps] = useState<StudentDPP[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationVersion, setNotificationVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setNotificationVersion((version) => version + 1);
    window.addEventListener("classphere:notification", refresh);
    return () => window.removeEventListener("classphere:notification", refresh);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchDPPs = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/api/v1/dpps/student", session.access_token) as any;
        if (res.success) setDpps(res.data.dpps ?? []);
      } catch (e) {
        console.error("[Assignments] fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDPPs();
  }, [session?.access_token, notificationVersion]);

  const late = dpps.filter((d) => d.status === "late");
  const pending = dpps.filter((d) => d.status === "pending");
  const completed = dpps.filter((d) => d.status === "submitted");

  return (
    <>
      <Navbar title="My DPPs" subtitle="Daily practice problems assigned by your teacher." breadcrumbs="My DPPs" />

      <PageWrapper>
        {/* Stats Row */}
        <MetricGrid cols={3}>
          <MetricCard icon={<RiTimeLine size={18} />} label="Pending DPPs" value={loading ? "—" : pending.length} badge="Active" badgeLabel="assigned" />
          <MetricCard icon={<RiAlertLine size={18} />} label="Overdue DPPs" value={loading ? "—" : late.length} badge={late.length > 0 ? "Action Needed" : "Clear"} badgeLabel="needs action" />
          <MetricCard icon={<RiCheckLine size={18} />} label="Completed DPPs" value={loading ? "—" : completed.length} badge="Done" badgeLabel="submitted" />
        </MetricGrid>

        {loading ? (
          <SectionCard padding="none">
            <div className="flex items-center justify-center gap-3 py-16 text-t-secondary">
              <RiLoader4Line size={22} className="animate-spin text-primary-01" />
              <span className="font-sans font-semibold text-[14px]">Loading your DPPs...</span>
            </div>
          </SectionCard>
        ) : dpps.length === 0 ? (
          <SectionCard padding="none">
            <EmptyState
              icon={<RiFileListLine size={48} />}
              title="No DPPs assigned yet"
              description="Your teacher will assign Daily Practice Problems here. Check back soon."
            />
          </SectionCard>
        ) : (
          <>
            {late.length > 0 && (
              <SectionCard title="Overdue DPPs" subtitle="These practice papers have passed their deadline" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {late.map((dpp) => <DPPCard key={dpp.dppId} dpp={dpp} />)}
                </div>
              </SectionCard>
            )}

            {pending.length > 0 && (
              <SectionCard title="Pending DPPs" subtitle="Complete these before their due dates" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {pending.map((dpp) => <DPPCard key={dpp.dppId} dpp={dpp} />)}
                </div>
              </SectionCard>
            )}

            {completed.length > 0 && (
              <SectionCard title="Completed DPPs" subtitle="DPPs you have already submitted">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {completed.map((dpp) => <DPPCard key={dpp.dppId} dpp={dpp} />)}
                </div>
              </SectionCard>
            )}
          </>
        )}
      </PageWrapper>
    </>
  );
}
