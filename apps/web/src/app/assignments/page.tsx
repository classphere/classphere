"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockStudentDPPs } from "@/lib/mock-data";
import {
  RiFileListLine,
  RiTimeLine,
  RiCheckLine,
  RiAlertLine,
  RiArrowRightLine,
} from "@remixicon/react";

export default function AssignmentsPage() {
  const pending   = mockStudentDPPs.filter(d => d.status === "pending");
  const late      = mockStudentDPPs.filter(d => d.status === "late");
  const completed = mockStudentDPPs.filter(d => d.status === "completed");

  return (
    <>
      <Navbar title="My DPPs" subtitle="Daily practice problems assigned by your teacher." breadcrumbs="My DPPs" />
      
      <main className="mx-auto w-full max-w-screen-lg px-6 pb-10 md:px-8">
        {/* Stats row */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { label: "Pending",   value: pending.length,   iconBg: "bg-[#EF9D0E]/10", textColor: "text-[#EF9D0E]" },
            { label: "Late",      value: late.length,      iconBg: "bg-[#FF6A55]/10", textColor: "text-[#FF6A55]" },
            { label: "Completed", value: completed.length, iconBg: "bg-[#00A656]/10", textColor: "text-[#00A656]" },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-4 p-5">
              <div className={`flex size-11 items-center justify-center rounded-xl ${s.iconBg}`}>
                <RiFileListLine className={s.textColor} size={22} />
              </div>
              <div>
                <div className={`text-h5 font-bold tracking-tight ${s.textColor} mb-1`}>{s.value}</div>
                <div className="text-caption text-t-secondary">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Late — show first, most urgent */}
        {late.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 pl-1">
              <RiAlertLine className="text-[#FF6A55]" size={18} />
              <h2 className="text-sub-title-2 font-bold text-[#FF6A55]">Overdue ({late.length})</h2>
            </div>
            <div className="flex flex-col gap-3">
              {late.map(dpp => <DPPCard key={dpp.id} dpp={dpp} />)}
            </div>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 pl-1">
              <RiTimeLine className="text-[#EF9D0E]" size={18} />
              <h2 className="text-sub-title-2 font-bold text-t-primary">Pending ({pending.length})</h2>
            </div>
            <div className="flex flex-col gap-3">
              {pending.map(dpp => <DPPCard key={dpp.id} dpp={dpp} />)}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 pl-1">
              <RiCheckLine className="text-[#00A656]" size={18} />
              <h2 className="text-sub-title-2 font-bold text-t-primary">Completed ({completed.length})</h2>
            </div>
            <div className="flex flex-col gap-3">
              {completed.map(dpp => <DPPCard key={dpp.id} dpp={dpp} />)}
            </div>
          </div>
        )}

        {mockStudentDPPs.length === 0 && (
          <div className="card text-center py-20 text-t-secondary">
            <RiFileListLine size={48} className="mx-auto mb-4 text-t-tertiary" />
            <p className="font-semibold text-body-2">No DPPs assigned yet.</p>
          </div>
        )}
      </main>
    </>
  );
}

function DPPCard({ dpp }: { dpp: typeof mockStudentDPPs[0] }) {
  const isCompleted = dpp.status === "completed";
  const isLate = dpp.status === "late";

  return (
    <div className="group relative card flex min-w-0 items-center gap-5 overflow-hidden border border-s-stroke2 bg-b-surface1 p-5 transition-all hover:border-transparent">
      {/* Signature Hover Effect */}
      <div className="box-hover" />
      
      {/* Icon */}
      <div className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl ${
        isLate 
          ? "bg-[#FF6A55]/10 text-[#FF6A55]" 
          : isCompleted 
            ? "bg-[#00A656]/10 text-[#00A656]" 
            : "bg-[#EF9D0E]/10 text-[#EF9D0E]"
      }`}>
        {isCompleted ? "✅" : isLate ? "⚠️" : "📝"}
      </div>

      {/* Info */}
      <div className="relative z-10 flex-1 min-w-0">
        <div className="text-body-2 font-bold text-t-primary mb-1 truncate">{dpp.title}</div>
        <div className="flex items-center gap-4 text-caption text-t-secondary flex-wrap">
          <span>{dpp.subject} · {dpp.chapter}</span>
          <span>{dpp.totalQuestions} questions</span>
          <span className={`font-semibold ${isLate ? "text-[#FF6A55]" : isCompleted ? "text-[#00A656]" : "text-[#EF9D0E]"}`}>
            Due: {dpp.dueDate}
          </span>
        </div>
      </div>

      {/* Score or Start button */}
      <div className="relative z-10 shrink-0">
        {isCompleted ? (
          <div className="text-right">
            <div className="text-body-1 font-bold text-[#00A656]">{dpp.score}/{dpp.maxScore}</div>
            <div className="text-caption text-t-secondary">{dpp.timeTakenMin} min</div>
          </div>
        ) : (
          <Link
            href={`/assignments/${dpp.id}`}
            className={`btn btn-sm ${
              isLate ? "btn-danger" : "btn-primary"
            }`}
          >
            {isLate ? "Submit Late" : "Start DPP"} <RiArrowRightLine size={16} className="ml-1" />
          </Link>
        )}
      </div>
    </div>
  );
}
