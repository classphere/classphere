import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { PremiumSectionCard } from "@/components/premium-ui";

const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-b-surface2 border border-s-subtle rounded-[10px] px-4 py-2.5 shadow-dropdown text-left z-50">
        <p className="text-[10px] font-sans font-bold text-t-tertiary uppercase tracking-wider mb-1.5">{entry.payload.subject}</p>
        <div className="flex items-center gap-4 justify-between min-w-[120px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-sans font-semibold text-t-primary">Avg Accuracy</span>
          </div>
          <span className="text-xs font-mono font-bold text-t-primary">{entry.value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

interface SubjectMasteryRadarProps {
  title: string;
  subtitle: string;
  data: any[];
  mounted: boolean;
}

export function SubjectMasteryRadar({ title, subtitle, data, mounted }: SubjectMasteryRadarProps) {
  return (
    <PremiumSectionCard title={title} subtitle={subtitle} className="mt-4">

      <div className="relative z-10 w-full h-[360px] flex items-center justify-center">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data || []}>
              <defs>
                <linearGradient id="colorRadar1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2A85FF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2A85FF" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="rgba(123, 123, 123, 0.15)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#727272", fontSize: 10, fontWeight: 600, fontFamily: "var(--font-sans)" }} dy={4} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Accuracy Index" dataKey="Score" stroke="#2A85FF" strokeWidth={2.5} fill="url(#colorRadar1)" fillOpacity={1} dot={{ r: 3, fill: '#2A85FF', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#2A85FF', strokeWidth: 0 }} />
              <Tooltip content={<CustomRadarTooltip />} cursor={{ fill: 'rgba(123,123,123,0.05)' }} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-t-secondary">Loading radar chart...</div>
        )}
      </div>
    </PremiumSectionCard>
  );
}
