"use client";

import React from "react";
import Link from "next/link";
import { RiArrowRightLine } from "@remixicon/react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { EXAM_TOTAL_MARKS, normaliseExamCode } from "@/lib/exam";

interface ScorePerformanceWidgetProps {
  data: any[];
  /** Exam code, so the subject lines and the total match what the student sits. */
  examCode: string | null | undefined;
  latestAttempt?: { id: string; title?: string; score?: number; max_score?: number };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-b-surface2 border border-s-stroke2/40 p-4 rounded-[16px] shadow-dropdown animate-in fade-in slide-in-from-bottom-2 duration-150">
        <p className="font-sans font-bold text-[14px] text-t-primary mb-3 uppercase tracking-widest border-b border-s-stroke2/40 pb-2">{label}</p>

        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[13px] font-medium text-t-secondary">{entry.name}</span>
              </div>
              <span className="text-[13px] font-semibold text-t-primary">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function ScorePerformanceWidget({
  data,
  examCode,
  latestAttempt,
}: ScorePerformanceWidgetProps) {
  const exam = normaliseExamCode(examCode);
  const isNEET = exam === "neet-ug";
  // Using custom colors for subjects
  const colors = {
    Overall: "url(#colorOverall)",
    Physics: "#0EA5E9",     // Sky blue
    Chemistry: "#8B5CF6",   // Purple
    Mathematics: "#F59E0B", // Amber
    Botany: "#10B981",      // Emerald
    Zoology: "#F43F5E",     // Rose
  };

  // The API sends `overall`; this read `.Overall`, so the headline score was
  // undefined and rendered 0 for every student on every test.
  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  const currentScore = latest?.overall ?? 0;
  const prevScore = previous?.overall ?? 0;
  const diff = currentScore - prevScore;

  // The paper's own total, not the exam's full-syllabus figure. Practice papers
  // and chapter tests are routinely 176 or 4 marks, so "/300" was wrong for a
  // JEE student too — not only for the NEET student seeing a JEE denominator.
  const maxMarks = latest?.max || latestAttempt?.max_score || EXAM_TOTAL_MARKS[exam];

  return (
    <SectionCard 
      title="Score Performance"
      subtitle="Marks per mock test"
    >
      <div className="flex flex-col w-full pt-2 gap-3">
        
        {/* Stats Container (Top) */}
        <div className="flex flex-col items-start gap-3 w-full mt-2">
          <div className="flex flex-row items-end gap-1.5 leading-none select-none">
            <span className="font-sans text-[48px] font-semibold tracking-[-0.04em] text-t-primary">
              {currentScore}
            </span>
            <span className="font-sans text-[32px] font-medium text-[#838383] mb-1">
              / {maxMarks}
            </span>
          </div>
          
          <div className="flex flex-row items-center gap-2.5 w-full">
            <div className={`flex flex-row justify-center items-center px-2 py-1 gap-1 rounded-[8px] shrink-0 ${diff >= 0 ? "bg-[#00A656]/10" : "bg-[#EF4444]/10"}`}>
              <span className={`text-[14px] font-bold leading-none ${diff >= 0 ? "text-[#00A656]" : "text-[#EF4444]"}`}>
                {diff > 0 ? `+${diff}` : diff}m
              </span>
            </div>
            <span className="text-[13px] font-sans font-medium text-t-secondary">
              vs last test
            </span>
          </div>
        </div>

        {/* Chart Container (Bottom) */}
        <div className="w-full h-[320px] min-w-0 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A656" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00A656" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#838383', fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#838383', fontWeight: 600 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(150,150,150,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: 12, fontWeight: 600, color: '#838383', paddingTop: '20px' }}
              />
              
              <Line type="monotone" dataKey="Physics" stroke={colors.Physics} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Chemistry" stroke={colors.Chemistry} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              
              {!isNEET && (
                <Line type="monotone" dataKey="Mathematics" stroke={colors.Mathematics} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              )}
              
              {isNEET && (
                <>
                  <Line type="monotone" dataKey="Botany" stroke={colors.Botany} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Zoology" stroke={colors.Zoology} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {latestAttempt && (
          <Link href={`/student/results/${latestAttempt.id}`} className="flex items-center justify-between rounded-[12px] border border-s-stroke2 bg-b-surface1 px-4 py-3 transition-colors hover:bg-b-surface2">
            <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wide text-t-secondary">Latest test</span><span className="mt-0.5 block truncate text-[13px] font-semibold text-t-primary">{latestAttempt.title ?? "Test"} · {latestAttempt.score ?? 0}/{latestAttempt.max_score ?? 0}</span></span>
            <RiArrowRightLine size={18} className="shrink-0 text-t-secondary" />
          </Link>
        )}

      </div>
    </SectionCard>
  );
}
