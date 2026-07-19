"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiArrowRightLine, RiLoader4Line, RiTimeLine } from "@remixicon/react";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

type RevisionTask = { id: string; subject: string; chapter: string; title: string; duration_minutes: number };

export function ActionRequiredWidget() {
  const { session } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<RevisionTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient.get<{ success: boolean; data: { tasks: RevisionTask[] } }>("/api/v1/dashboard/student/revision-queue", session.access_token)
      .then((response) => { if (response.success) setTasks(response.data.tasks); })
      // A missing queue must not make the student dashboard unusable during a
      // rolling deployment. The API/migration still records the real failure.
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <SectionCard title="Today's Revision" headerRight={<span className="inline-flex h-[26px] items-center rounded-[8px] bg-primary-01/10 px-3 text-[11px] font-bold uppercase tracking-wider text-primary-01">{tasks.length} due</span>}>
      {loading ? <div className="flex h-24 items-center justify-center text-t-secondary"><RiLoader4Line className="animate-spin" size={20} /></div> : tasks.length ? <div className="mt-2 space-y-3">
        {tasks.slice(0, 3).map((task) => (
          <div key={task.id} className="rounded-[12px] border border-s-stroke2 bg-b-surface1 p-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[13px] font-bold text-t-primary">{task.title}</p><p className="mt-1 truncate text-[11px] text-t-secondary">{task.subject} · {task.chapter} · {task.duration_minutes} min</p></div><button onClick={() => router.push(`/student/revision/${task.id}`)} className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary-01">Start <RiArrowRightLine size={15} /></button></div>
          </div>
        ))}
        <button onClick={() => router.push("/student/mistakes")} className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-s-stroke2 text-[12px] font-bold text-t-secondary hover:text-t-primary"><RiTimeLine size={15} /> Open mistake diary</button>
      </div> : <div className="py-5 text-center"><p className="text-[13px] font-semibold text-t-primary">Nothing due right now.</p><p className="mt-1 text-[12px] text-t-secondary">Finish a test to receive a focused revision task.</p></div>}
    </SectionCard>
  );
}
