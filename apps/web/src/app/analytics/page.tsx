"use client";

import Navbar from "@/components/layout/Navbar";
import { RiLineChartLine, RiTimeLine, RiCrosshair2Line, RiTrophyLine } from "@remixicon/react";

const topicPerformance = [
  { topic: "Kinematics", accuracy: 92, status: "Strong" },
  { topic: "Thermodynamics", accuracy: 85, status: "Good" },
  { topic: "Electromagnetism", accuracy: 45, status: "Weak" },
  { topic: "Rotational Mechanics", accuracy: 30, status: "Critical" },
  { topic: "Optics", accuracy: 78, status: "Good" },
];

export default function StudentAnalyticsPage() {
  return (
    <>
      <Navbar title="My Performance Analytics" />
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">
        
        {/* KPI Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-primary-01/10 p-2.5 text-primary-01">
                <RiCrosshair2Line size={24} />
              </div>
              <h3 className="text-body-2 font-semibold text-t-secondary">Overall Accuracy</h3>
            </div>
            <div className="text-h4 font-bold text-t-primary">76.4%</div>
            <p className="mt-2 text-caption font-semibold text-[#00A656]">+4.2% from last month</p>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-[#EF9D0E]/10 p-2.5 text-[#EF9D0E]">
                <RiTimeLine size={24} />
              </div>
              <h3 className="text-body-2 font-semibold text-t-secondary">Avg Time / Question</h3>
            </div>
            <div className="text-h4 font-bold text-t-primary">1m 45s</div>
            <p className="mt-2 text-caption font-semibold text-[#FF6A55]">+15s slower than target</p>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-primary-04/10 p-2.5 text-primary-04">
                <RiTrophyLine size={24} />
              </div>
              <h3 className="text-body-2 font-semibold text-t-secondary">Batch Percentile</h3>
            </div>
            <div className="text-h4 font-bold text-t-primary">88th</div>
            <p className="mt-2 text-caption text-t-secondary">Top 12% of Aakash Target Batch</p>
          </div>
          
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-b-surface1 p-2.5 text-t-primary">
                <RiLineChartLine size={24} />
              </div>
              <h3 className="text-body-2 font-semibold text-t-secondary">Tests Attempted</h3>
            </div>
            <div className="text-h4 font-bold text-t-primary">42</div>
            <p className="mt-2 text-caption text-t-secondary">This academic year</p>
          </div>
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-2">
          {/* Topic Wise Analysis */}
          <div className="card p-6">
            <h2 className="section-title mb-5">Topic-wise Strengths & Weaknesses</h2>
            <div className="flex flex-col gap-4">
              {topicPerformance.map((item, idx) => (
                <div key={idx}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-body-2 font-semibold text-t-primary">{item.topic}</span>
                    <span className="text-caption text-t-secondary">{item.accuracy}% Accuracy</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-b-surface1">
                      <div 
                        style={{ 
                          width: `${item.accuracy}%`, 
                          height: "100%", 
                          background: item.accuracy > 80 ? "var(--success-50)" : item.accuracy > 50 ? "var(--warning-50)" : "var(--error-50)" 
                        }} 
                      />
                    </div>
                    <span className={`label ${item.accuracy > 80 ? "label-green" : item.accuracy > 50 ? "label-yellow" : "label-red"}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Management Analysis */}
          <div className="card p-6">
            <h2 className="section-title mb-5">Time Management (Physics)</h2>
            <p className="text-body-2 text-t-secondary mb-6">
              You are spending too much time on mechanics questions. Try to use our time-bound booster tests to improve speed.
            </p>
            
            <div className="flex flex-col gap-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-body-2 font-semibold text-t-primary">Mechanics (Avg: 3m 12s)</span>
                  <span className="text-caption font-semibold text-[#FF6A55]">Target: 2m 00s</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-b-surface1">
                  <div className="h-full w-[80%] bg-[#FF6A55]" />
                  {/* Target Marker */}
                  <div className="absolute inset-y-0 left-1/2 z-10 w-0.5 bg-t-primary" />
                </div>
              </div>
              
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-body-2 font-semibold text-t-primary">Electrodynamics (Avg: 1m 45s)</span>
                  <span className="text-caption font-semibold text-[#00A656]">Target: 2m 00s</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-b-surface1">
                  <div className="h-full w-[40%] bg-[#00A656]" />
                  <div className="absolute inset-y-0 left-1/2 z-10 w-0.5 bg-t-primary" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-body-2 font-semibold text-t-primary">Modern Physics (Avg: 2m 10s)</span>
                  <span className="text-caption font-semibold text-[#EF9D0E]">Target: 2m 00s</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-b-surface1">
                  <div className="h-full w-[55%] bg-[#EF9D0E]" />
                  <div className="absolute inset-y-0 left-1/2 z-10 w-0.5 bg-t-primary" />
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <button className="btn btn-primary flex items-center gap-2">
                <RiTimeLine size={18} /> Generate Speed Booster Test
              </button>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
