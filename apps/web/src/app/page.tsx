"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockUser, mockStats, mockRecentTests } from "@/lib/mock-data";
import {
  RiBarChartBoxLine,
  RiArrowRightUpLine,
  RiArrowDownSLine,
  RiMoreFill,
  RiRulerLine,
  RiTestTubeLine,
  RiMore2Fill,
  RiAlertFill,
  RiSparklingFill,
  RiShieldCrossFill
} from "@remixicon/react";

export default function Dashboard() {
  return (
    <>
      <Navbar />
      
      <main style={{ padding: "0 32px 32px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        
        {/* ── Top Row: Performance Overview (Left) + Team Updates (Right) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, marginBottom: 24 }}>
          
          {/* Performance Overview Section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 className="section-title">Performance Overview</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--fg-muted)", cursor: "pointer" }}>
                This week <RiArrowDownSLine size={16} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              
              {/* Stat 1: Total Tests */}
              <div className="rayum-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="t-body-sm text-bold" style={{ color: "var(--fg-default)" }}>Total Tests Taken</span>
                  <span style={{ color: "var(--fg-muted)" }}><RiBarChartBoxLine size={18} /></span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", marginBottom: 8, letterSpacing: "-0.02em" }}>
                  {mockStats.totalTests}
                </div>
                <div style={{ marginBottom: 24 }}>
                  <span className="badge badge-dark" style={{ marginRight: 6 }}>+12% vs last week</span>
                </div>
                {/* Micro Chart (Line) */}
                <div style={{ marginTop: "auto", height: 40, borderBottom: "2px solid var(--p-50)", position: "relative" }}>
                   <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 40">
                     <path d="M0,30 Q10,20 20,25 T40,15 T60,20 T80,5 T100,10" fill="none" stroke="var(--p-50)" strokeWidth="3"/>
                   </svg>
                </div>
              </div>

              {/* Stat 2: Avg Score */}
              <div className="rayum-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="t-body-sm text-bold" style={{ color: "var(--fg-default)" }}>Average Score</span>
                  <span style={{ color: "var(--fg-muted)" }}><RiBarChartBoxLine size={18} /></span>
                </div>
                <p className="t-body-sm" style={{ marginBottom: 24 }}>
                  <strong style={{ color: "var(--fg-default)" }}>86 marks</strong> avg. +15% vs last week.
                </p>
                {/* Micro Chart (Bars) */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40, marginTop: "auto" }}>
                   {[40, 60, 30, 80, 50, 90, 70, 60, 80, 50].map((h, i) => (
                     <div key={i} style={{ flex: 1, height: `${h}%`, background: i % 2 === 0 ? "var(--p-20)" : "var(--p-50)", borderRadius: 2 }} />
                   ))}
                </div>
              </div>

              {/* Stat 3: Accuracy */}
              <div className="rayum-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="t-body-sm text-bold" style={{ color: "var(--fg-default)" }}>Accuracy Rate</span>
                  <span style={{ color: "var(--fg-muted)" }}><RiMoreFill size={18} /></span>
                </div>
                <div style={{ marginTop: "auto", marginBottom: 12 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", marginBottom: 8, letterSpacing: "-0.02em" }}>
                    {mockStats.accuracy}%
                  </div>
                  <span className="badge badge-green">
                    <RiArrowRightUpLine size={12} /> +5.2%
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Team/Batch Updates Right Panel */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div className="rayum-card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: -8, marginBottom: 24 }}>
                 {/* Top row of 2 avatars */}
                 <div style={{ display: "flex", justifyContent: "center", marginBottom: -12, zIndex: 2 }}>
                   <div className="avatar avatar-lg" style={{ border: "2px solid white", zIndex: 2, background: "var(--s-50)" }}>JD</div>
                   <div className="avatar avatar-lg" style={{ border: "2px solid white", marginLeft: -12, zIndex: 1, background: "var(--p-50)" }}>AS</div>
                 </div>
                 {/* Bottom row of 2 avatars */}
                 <div style={{ display: "flex", justifyContent: "center", zIndex: 1 }}>
                   <div className="avatar avatar-lg" style={{ border: "2px solid white", zIndex: 2, background: "var(--warning-50)" }}>MK</div>
                   <div className="avatar avatar-lg" style={{ border: "2px solid white", marginLeft: -12, zIndex: 1, background: "var(--danger-50)" }}>RJ</div>
                 </div>
              </div>
              <h3 className="t-sub-s" style={{ marginBottom: 4 }}>Batch Updates</h3>
              <p className="t-body-sm" style={{ marginBottom: 24 }}>3 urgent from "Target JEE 2026"</p>
              <button className="btn btn-outline" style={{ width: "100%" }}>
                Open Inbox
              </button>
            </div>
          </div>

        </div>

        {/* ── Middle Row: Charts ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, marginBottom: 24 }}>
          
          {/* Main Chart Card */}
          <div className="rayum-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
               <div>
                 <h3 className="section-title">Score Performance</h3>
                 <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                   <span style={{ fontSize: 24, fontWeight: 800 }}>86.4%</span>
                   <span className="badge badge-dark">
                     <RiArrowRightUpLine size={12} /> 105% of Goal
                   </span>
                 </div>
                 <p className="t-body-sm" style={{ marginTop: 8 }}>Best performing month driven by Physics.</p>
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--fg-muted)", cursor: "pointer", height: "fit-content" }}>
                 Year: 2026 <RiArrowDownSLine size={16} />
               </div>
             </div>
             
             {/* Large Bar Chart */}
             <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200, paddingBottom: 32, marginTop: "auto" }}>
                {[30, 45, 60, 40, 70, 90, 60, 30, 40, 50, 45, 30, 20, 40, 100, 70, 50, 40].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--s-50)", borderRadius: "4px 4px 0 0", opacity: i % 3 === 0 ? 0.4 : 1 }} />
                ))}
             </div>
             {/* Chart Legend */}
             <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: "var(--s-50)", borderRadius: 2 }}/> Actual Score</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: "var(--s-50)", opacity: 0.4, borderRadius: 2 }}/> vs 2025</div>
             </div>
          </div>

          {/* Donut Chart Card */}
          <div className="rayum-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
               <h3 className="section-title" style={{ fontSize: 18 }}>Topic Mastery</h3>
               <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--fg-muted)", cursor: "pointer" }}>
                 This week <RiArrowDownSLine size={16} />
               </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 180, marginBottom: 32, position: "relative" }}>
              <div style={{ width: 160, height: 160, borderRadius: "50%", border: "24px solid var(--s-50)", borderLeftColor: "var(--p-50)", borderBottomColor: "var(--p-20)" }}></div>
              <div style={{ position: "absolute", fontSize: 32, fontWeight: 800 }}>64%</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: "auto" }}>
               <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>
                 <div style={{ width: 10, height: 10, background: "var(--s-50)", borderRadius: 2 }}/> Physics (64%)
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>
                 <div style={{ width: 10, height: 10, background: "var(--p-50)", borderRadius: 2 }}/> Chemistry (10%)
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>
                 <div style={{ width: 10, height: 10, background: "var(--p-20)", borderRadius: 2 }}/> Maths (26%)
               </div>
            </div>
          </div>

        </div>

        {/* ── Bottom Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          
          {/* Recent Tests List */}
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
               <h3 className="section-title" style={{ fontSize: 18 }}>Recent Tests</h3>
               <Link href="/history" style={{ fontSize: 13, color: "var(--s-50)", textDecoration: "none", fontWeight: 600 }}>View All</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mockRecentTests.slice(0, 4).map(test => (
                <div key={test.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--border-default)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, background: "var(--n-10)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
                      {test.exam === "JEE" ? <RiRulerLine size={22} /> : <RiTestTubeLine size={22} />}
                    </div>
                    <div>
                      <div className="text-bold" style={{ fontSize: 14 }}>{test.title}</div>
                      <div className="t-body-sm" style={{ marginTop: 2 }}>Score: {test.percentage}%</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--fg-muted)", cursor: "pointer", display: "flex" }}>
                    <RiMore2Fill size={20} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts & Live Activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="rayum-card" style={{ padding: 24 }}>
              <span className="badge badge-orange" style={{ marginBottom: 12 }}>
                <RiAlertFill size={12} /> Action Required
              </span>
              <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Critical Boosters Ready</h3>
              <div style={{ display: "flex", gap: -8, marginBottom: 16 }}>
                 <div className="avatar avatar-lg" style={{ border: "2px solid white", zIndex: 3, background: "url(https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=100&auto=format&fit=crop) center/cover" }}></div>
                 <div className="avatar avatar-lg" style={{ border: "2px solid white", marginLeft: -12, zIndex: 2, background: "url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop) center/cover" }}></div>
                 <div className="avatar avatar-lg" style={{ border: "2px solid white", marginLeft: -12, zIndex: 1, background: "var(--n-20)", color: "var(--n-60)" }}>+2</div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
                <span className="t-body-sm">Topics degrading</span>
                <span className="badge badge-gray">High Risk</span>
              </div>
            </div>

            <div className="rayum-card" style={{ padding: 24 }}>
               <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                 <h3 className="section-title" style={{ fontSize: 16 }}>Live Batch Activity</h3>
                 <span style={{ color: "var(--fg-muted)", display: "flex", cursor: "pointer" }}><RiMoreFill size={18} /></span>
               </div>
               <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                 <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>842</span>
                 <span className="t-body-sm">Taking tests right now.</span>
               </div>
               <div className="t-label" style={{ marginBottom: 12 }}>Students Online</div>
               <div style={{ display: "flex", gap: -8 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="avatar avatar-md" style={{ background: "var(--s-50)", border: "2px solid white", marginLeft: i > 1 ? -8 : 0 }}>{i}</div>
                  ))}
                  <div className="avatar avatar-md" style={{ background: "var(--n-20)", color: "var(--n-60)", border: "2px solid white", marginLeft: -8 }}>+8</div>
               </div>
            </div>
          </div>

          {/* AI Insight Card */}
          <div className="rayum-card" style={{ padding: 32, background: "var(--p-50)", border: "none", color: "var(--n-100)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                 <RiSparklingFill size={18} /> Insight
               </div>
               <span style={{ cursor: "pointer", display: "flex" }}><RiMoreFill size={20} /></span>
            </div>
            
            <h2 className="t-heading" style={{ marginBottom: 24 }}>Topic Risk</h2>
            
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
               <RiShieldCrossFill size={100} color="rgba(0,0,0,0.8)" />
            </div>

            <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, marginBottom: 32, color: "rgba(0,0,0,0.8)" }}>
              Accuracy for <span style={{ fontWeight: 800, color: "black" }}>Laws of Motion</span> dropped -15% this week. 
              Knowledge gap identified by Friday. Est. impact: <span style={{ fontWeight: 800, color: "black" }}>-12 marks</span>.
            </p>

            <button className="btn" style={{ width: "100%", background: "transparent", border: "1.5px solid rgba(0,0,0,0.2)", color: "black", marginBottom: 12 }}>
              Take Booster Test
            </button>
            <button className="btn btn-dark" style={{ width: "100%" }}>
              Review Concepts
            </button>
          </div>

        </div>

      </main>
    </>
  );
}