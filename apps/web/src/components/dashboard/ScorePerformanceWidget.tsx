"use client";

import React, { useState } from "react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";

interface ScorePerformanceWidgetProps {
  data: any[];
  isNEET: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#FAFAFA] dark:bg-[#161616] border border-s-stroke2/40 p-4 rounded-[16px] shadow-dropdown animate-in fade-in slide-in-from-bottom-2 duration-150">
        <p className="font-sans font-bold text-[14px] text-t-primary mb-3 uppercase tracking-widest border-b border-s-stroke2/40 pb-2">{label}</p>

        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-6">
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
  isNEET,
}: ScorePerformanceWidgetProps) {
  // Using custom colors for subjects
  const colors = {
    Overall: "url(#colorOverall)",
    Physics: "#0EA5E9",     // Sky blue
    Chemistry: "#8B5CF6",   // Purple
    Mathematics: "#F59E0B", // Amber
    Botany: "#10B981",      // Emerald
    Zoology: "#F43F5E",     // Rose
  };

  const currentScore = data[data.length - 1]?.Overall || 0;
  const prevScore = data[data.length - 2]?.Overall || 0;
  const diff = currentScore - prevScore;
  const maxMarks = isNEET ? 720 : 300;

  return (
    <SectionCard 
      title="Score Performance"
      subtitle="Marks per mock test"
    >
      <div className="flex flex-col w-full pt-2 gap-8">
        
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

      </div>
    </SectionCard>
  );
}
