"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockUser, mockStats, mockRecentTests } from "@/lib/mock-data";
import {
  RiBarChartBoxLine,
  RiMoreFill,
  RiArrowRightUpLine,
  RiArrowDownSLine,
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
        
        {/* Top Row: Performance Overview (Left) + Team Updates (Right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, marginBottom: 24 }}>
          
          {/* Performance Overview Card */}
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 className="text-h3">Performance Overview</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--fg-muted)", cursor: "pointer" }}>
                This week <RiArrowDownSLine size={16} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              
              {/* Stat 1 */}
              <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="text-bold">Total Tests</span>
                  <span style={{ color: "var(--fg-muted)", display: "flex" }}><RiBarChartBoxLine size={18} /></span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--fg-default)", marginBottom: 8 }}>
                  {mockStats.totalTests}
                </div>
                <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  +12% vs last week
                </span>
                <div style={{ marginTop: 16, height: 40, borderBottom: "2px solid var(--primary-50)", position: "relative" }}>
                   {/* Fake line chart */}
                   <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 40">
                     <path d="M0,30 Q10,20 20,25 T40,15 T60,20 T80,5 T100,10" fill="none" stroke="var(--primary-50)" strokeWidth="3"/>
                   </svg>
                </div>
              </div>

              {/* Stat 2 */}
              <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="text-bold">Average Score</span>
                  <span style={{ color: "var(--fg-muted)", display: "flex" }}><RiBarChartBoxLine size={18} /></span>
                </div>
                <p style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 12 }}>
                  <span className="text-bold" style={{ color: "var(--fg-default)" }}>86 marks</span> avg. +15% vs last week.
                </p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40 }}>
                   {/* Fake bar chart */}
                   {[40, 60, 30, 80, 50, 90, 70, 60, 80, 50].map((h, i) => (
                     <div key={i} style={{ flex: 1, height: `${h}%`, background: i % 2 === 0 ? "var(--primary-20)" : "var(--primary-50)", borderRadius: 2 }} />
                   ))}
                </div>
              </div>

              {/* Stat 3 */}
              <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: 16, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="text-bold">Accuracy Rate</span>
                  <span style={{ color: "var(--fg-muted)", display: "flex" }}><RiMoreFill size={18} /></span>
                </div>
                <div style={{ marginTop: "auto" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--fg-default)", marginBottom: 8 }}>
                    {mockStats.accuracy}%
                  </div>
                  <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <RiArrowRightUpLine size={12} /> +5.2%
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Team Updates Card */}
          <div className="rayum-card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
               {/* Overlapping Avatars */}
               <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--secondary-50)", border: "2px solid white", zIndex: 3 }}></div>
               <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--primary-50)", border: "2px solid white", marginLeft: -12, zIndex: 2 }}></div>
               <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--warning-50)", border: "2px solid white", marginLeft: -12, zIndex: 1 }}></div>
            </div>
            <h3 className="text-h3" style={{ marginBottom: 4 }}>Batch Updates</h3>
            <p className="text-body" style={{ marginBottom: 24 }}>3 urgent from "Target JEE 2026"</p>
            <button className="btn btn-outline" style={{ width: "100%", padding: "10px 0" }}>
              Open Inbox
            </button>
          </div>

        </div>

        {/* Middle Row: Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, marginBottom: 24 }}>
          
          <div className="rayum-card" style={{ padding: 24, position: "relative" }}>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
               <div>
                 <h3 className="text-h3" style={{ marginBottom: 8 }}>Score Performance</h3>
                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                   <span style={{ fontSize: 24, fontWeight: 800 }}>86.4%</span>
                   <span className="rayum-badge green" style={{ background: "#07200C", color: "var(--primary-50)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                     <RiArrowRightUpLine size={12} /> 105% of Goal
                   </span>
                 </div>
                 <p className="text-body" style={{ marginTop: 4 }}>Best performing month driven by Physics.</p>
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--fg-muted)", cursor: "pointer" }}>
                 Year: 2026 <RiArrowDownSLine size={16} />
               </div>
             </div>
             
             {/* Fake wide bar chart */}
             <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, paddingBottom: 24 }}>
                {[30, 45, 60, 40, 70, 90, 60, 30, 40, 50, 45, 30, 20, 40, 100, 70, 50, 40].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--secondary-50)", borderRadius: "4px 4px 0 0", opacity: i % 3 === 0 ? 0.4 : 1 }} />
                ))}
             </div>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
               <h3 className="text-bold">Topic Mastery</h3>
               <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--fg-muted)", cursor: "pointer" }}>
                 This week <RiArrowDownSLine size={16} />
               </div>
            </div>
            {/* Fake Donut Chart */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 160, marginBottom: 24, position: "relative" }}>
              <div style={{ width: 140, height: 140, borderRadius: "50%", border: "24px solid var(--secondary-50)", borderLeftColor: "var(--primary-50)", borderBottomColor: "var(--primary-20)" }}></div>
              <div style={{ position: "absolute", fontSize: 28, fontWeight: 800 }}>64%</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "var(--fg-muted)" }}>
               <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, background: "var(--secondary-50)", borderRadius: 2 }}/> Physics (64%)</div>
               <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, background: "var(--primary-50)", borderRadius: 2 }}/> Chemistry (10%)</div>
               <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, background: "var(--primary-20)", borderRadius: 2 }}/> Maths (26%)</div>
            </div>
          </div>

        </div>

        {/* Bottom Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
               <h3 className="text-bold">Recent Tests</h3>
               <Link href="/history" style={{ fontSize: 13, color: "var(--secondary-50)", textDecoration: "none", fontWeight: 600 }}>View All</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mockRecentTests.slice(0, 4).map(test => (
                <div key={test.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, background: "var(--neutral-10)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
                      {test.exam === "JEE" ? <RiRulerLine size={24} /> : <RiTestTubeLine size={24} />}
                    </div>
                    <div>
                      <div className="text-bold" style={{ fontSize: 14 }}>{test.title}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Score: {test.percentage}%</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--fg-muted)", cursor: "pointer", display: "flex" }}>
                    <RiMore2Fill size={20} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="rayum-card" style={{ padding: 24 }}>
              <span className="rayum-badge orange" style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <RiAlertFill size={14} /> Action Required
              </span>
              <h3 className="text-h3" style={{ marginBottom: 16 }}>Critical Boosters Ready</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                 <div style={{ width: 48, height: 48, background: "var(--neutral-10)", borderRadius: "50%" }}></div>
                 <div style={{ width: 48, height: 48, background: "var(--neutral-10)", borderRadius: "50%" }}></div>
                 <div style={{ width: 48, height: 48, background: "var(--neutral-10)", borderRadius: "50%" }}></div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="text-body">Topics degrading</span>
                <span className="rayum-badge" style={{ border: "1px solid var(--border-muted)", color: "var(--fg-muted)" }}>High Risk</span>
              </div>
            </div>

            <div className="rayum-card" style={{ padding: 24 }}>
               <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                 <h3 className="text-bold">Live Batch Activity</h3>
                 <span style={{ color: "var(--fg-muted)", display: "flex", cursor: "pointer" }}><RiMoreFill size={18} /></span>
               </div>
               <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                 <span style={{ fontSize: 32, fontWeight: 800 }}>842</span>
                 <span className="text-body">Taking tests right now.</span>
               </div>
               <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>Students Online</div>
               <div style={{ display: "flex", gap: 4 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ width: 32, height: 32, background: "var(--secondary-50)", borderRadius: "50%", border: "2px solid white" }}></div>
                  ))}
                  <div style={{ width: 32, height: 32, background: "var(--neutral-20)", borderRadius: "50%", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold" }}>+8</div>
               </div>
            </div>
          </div>

          <div className="rayum-card" style={{ padding: 24, background: "var(--primary-50)", border: "none", color: "var(--neutral-100)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                 <RiSparklingFill size={18} /> Insight
               </div>
               <span style={{ cursor: "pointer", display: "flex" }}><RiMoreFill size={20} /></span>
            </div>
            
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Topic Risk</h2>
            
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
               <RiShieldCrossFill size={80} color="rgba(0,0,0,0.8)" />
            </div>

            <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5, marginBottom: 24, color: "rgba(0,0,0,0.8)" }}>
              Accuracy for <span style={{ fontWeight: 800, color: "black" }}>Laws of Motion</span> dropped -15% this week. 
              Knowledge gap identified by Friday. Est. impact: <span style={{ fontWeight: 800, color: "black" }}>-12 marks</span>.
            </p>

            <button style={{ width: "100%", padding: 16, background: "transparent", border: "1px solid rgba(0,0,0,0.2)", borderRadius: "var(--radius-full)", fontWeight: 700, marginBottom: 8, cursor: "pointer" }}>
              Take Booster Test
            </button>
            <button style={{ width: "100%", padding: 16, background: "#000", color: "white", border: "none", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer" }}>
              Review Concepts
            </button>
          </div>

        </div>

      </main>
    </>
  );
}