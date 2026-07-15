import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { PremiumSectionCard } from "@/components/premium-ui";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-b-surface2 border border-s-subtle rounded-[10px] px-4 py-3.5 shadow-dropdown text-left z-50">
        <p className="text-[10px] font-sans font-bold text-t-tertiary uppercase tracking-wider mb-2.5">{label}</p>
        <div className="flex flex-col gap-2 min-w-[120px]">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-4 justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-sans font-semibold text-t-primary">{entry.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-t-primary">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface PerformanceChartProps {
  title: string;
  subtitle: string;
  data: any[];
  mounted: boolean;
}

export function PerformanceChart({ title, subtitle, data, mounted }: PerformanceChartProps) {
  const headerRight = (
    <div className="flex flex-row items-center gap-4 bg-b-surface1 dark:bg-b-surface1/40 px-3 py-1.5 rounded-[10px] border border-s-stroke2/10 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary-01" />
        <span className="text-[11px] font-sans font-semibold text-t-secondary dark:text-t-secondary">Aggregate</span>
      </div>
    </div>
  );

  return (
    <PremiumSectionCard title={title} subtitle={subtitle} headerRight={headerRight} className="lg:col-span-2 mt-4">

      <div className="relative z-10 w-full h-[320px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2A85FF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2A85FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(123, 123, 123, 0.15)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7B7B7B", fontWeight: 500, fontFamily: "var(--font-sans)" }} dy={10} />
              <YAxis domain={[40, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7B7B7B", fontWeight: 500, fontFamily: "var(--font-sans)" }} dx={-10} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(123,123,123,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="Score" stroke="#2A85FF" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2A85FF' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-t-secondary">Loading chart...</div>
        )}
      </div>
    </PremiumSectionCard>
  );
}
