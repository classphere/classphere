"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  RiBuilding4Line,
  RiMore2Fill,
  RiSearchLine,
  RiFilter3Line,
  RiArrowDownSLine,
  RiCloseLine,
} from "@remixicon/react";

const mockInstitutes = [
  { id: "INST-001", name: "Allen Career Institute", location: "Kota, RJ", students: 12450, plan: "Enterprise", status: "Active" },
  { id: "INST-002", name: "Resonance Eduventures", location: "Kota, RJ", students: 8200, plan: "Enterprise", status: "Active" },
  { id: "INST-003", name: "Vibrant Academy", location: "Mumbai, MH", students: 3400, plan: "Pro", status: "Active" },
  { id: "INST-004", name: "Narayana Group", location: "Hyderabad, TS", students: 15600, plan: "Enterprise", status: "Active" },
  { id: "INST-005", name: "Sri Chaitanya", location: "Vijayawada, AP", students: 14200, plan: "Enterprise", status: "Active" },
  { id: "INST-006", name: "Aakash Institute", location: "Delhi, DL", students: 9800, plan: "Enterprise", status: "Active" },
  { id: "INST-007", name: "Fitjee", location: "Delhi, DL", students: 6500, plan: "Pro", status: "Active" },
  { id: "INST-008", name: "Bansal Classes", location: "Kota, RJ", students: 2100, plan: "Basic", status: "Inactive" },
];

export default function InstitutesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInstituteData, setNewInstituteData] = useState({
    name: "",
    adminEmail: "",
    type: "jee",
    price: 500,
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateInstitute = async () => {
    if (!newInstituteData.name || !newInstituteData.adminEmail) {
      alert("Please provide both name and admin email.");
      return;
    }
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/v1/institutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInstituteData),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Error: " + data.message);
      } else {
        alert("Institute provisioned successfully!");
        setIsCreateModalOpen(false);
        setNewInstituteData({ name: "", adminEmail: "", type: "jee", price: 500 });
      }
    } catch (err) {
      alert("Failed to provision institute.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Navbar title="Institutes CRM" subtitle="Manage your partner database and enterprise clients." />
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6">
        
        {/* KPI Cards (Row of 4 active highlighted boxes) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg mb-8">
          
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Total Institutes
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                42
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                  <span className="text-[#00A656] text-[12px] font-semibold leading-none">+2</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  this week
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Active Students
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                72.3k
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                  <span className="text-[#00A656] text-[12px] font-semibold leading-none">+8.1%</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  boost
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Enterprise Plans
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                18
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                  <span className="text-[#00A656] text-[12px] font-semibold leading-none">+1</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  new client
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                MRR
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                $124k
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                  <span className="text-[#00A656] text-[12px] font-semibold leading-none">+12%</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  vs last month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="group relative card flex flex-col rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden">
          <div className="box-hover" />
          
          {/* Table Header Controls */}
          <div className="relative z-10 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between border-b border-s-stroke2/30">
            <div className="relative w-full max-w-md flex items-center">
              <RiSearchLine size={18} className="absolute left-4 text-[#7B7B7B]" />
              <input 
                type="text" 
                placeholder="Search institutes..." 
                className="w-full h-11 pl-11 pr-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 h-11 px-5 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-semibold text-[#101010] dark:text-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                Filter by <RiFilter3Line size={16} className="text-[#7B7B7B]" />
              </button>
              <button className="flex items-center gap-2 h-11 px-5 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-semibold text-[#101010] dark:text-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                Sort by <RiFilter3Line size={16} className="text-[#7B7B7B]" />
              </button>
              <button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="flex items-center gap-2 h-11 px-6 rounded-lg bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 text-[14px] font-semibold hover:bg-[#202020] transition-colors shadow-sm active:scale-[0.98]"
              >
                <RiBuilding4Line size={16} /> New
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full text-left text-[14px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-s-stroke2/30 text-[#7B7B7B] text-[12px] uppercase tracking-[0.05em]">
                  <th className="px-6 py-4 font-semibold">Institute</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Students</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[#101010] dark:text-t-primary font-medium">
                {mockInstitutes.map((institute, i) => (
                  <tr key={institute.id} className="border-b border-s-stroke2/20 hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/60 transition-colors group/row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#F4F4F4] dark:bg-b-surface1 border border-s-stroke2/20 flex items-center justify-center font-bold text-[14px]">
                          {institute.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[14px] truncate">{institute.name}</div>
                          <div className="text-[13px] text-[#7B7B7B] font-medium">{institute.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#7B7B7B]">{institute.location}</td>
                    <td className="px-6 py-4 font-bold">{institute.students.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider ${
                        institute.plan === "Enterprise" 
                          ? "bg-[rgba(94,92,230,0.08)] text-[#5E5CE6]" 
                          : institute.plan === "Pro"
                          ? "bg-[rgba(10,132,255,0.08)] text-[#0A84FF]"
                          : "bg-[#F4F4F4] dark:bg-b-surface1 text-[#7B7B7B]"
                      }`}>
                        {institute.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider ${
                        institute.status === "Active" 
                          ? "bg-[rgba(0,166,86,0.08)] text-[#00A656]" 
                          : "bg-[rgba(239,68,68,0.08)] text-[#EF4444]"
                      }`}>
                        {institute.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-[#7B7B7B] hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/40 hover:text-[#101010] dark:hover:text-t-primary transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100">
                        <RiMore2Fill size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="relative z-10 flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between bg-[#FDFDFD] dark:bg-b-surface2 rounded-b-[32px]">
            <div className="text-[13px] text-[#7B7B7B] font-medium">
              <span className="font-bold text-[#101010] dark:text-t-primary">8</span> institutes selected
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[13px] font-semibold">
                  &lt;
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[13px] font-semibold">
                  1
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 transition-colors text-[13px] font-semibold">
                  2
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[13px] font-semibold">
                  3
                </button>
                <span className="text-[#7B7B7B] mx-1">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[13px] font-semibold">
                  10
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[13px] font-semibold">
                  &gt;
                </button>
              </div>
              
              <div className="w-px h-6 bg-s-stroke2/40 mx-2" />
              
              <div className="text-[13px] text-[#7B7B7B] font-medium mr-2">
                10-20 of 200 items
              </div>
              
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[13px] font-medium text-[#101010] dark:text-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors">
                10 per page <RiArrowDownSLine size={14} className="text-[#7B7B7B]" />
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* New Institute Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-s-stroke2/40">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[22px] font-bold text-[#101010] dark:text-t-primary tracking-tight">Onboard New Institute</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary transition-colors cursor-pointer"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Institute Name</label>
                <input 
                  type="text" 
                  className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[15px] text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                  placeholder="e.g., Allen Career Institute" 
                  value={newInstituteData.name} 
                  onChange={(e) => setNewInstituteData({ ...newInstituteData, name: e.target.value })} 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Admin Email</label>
                <input 
                  type="email" 
                  className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[15px] text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                  placeholder="admin@institute.com" 
                  value={newInstituteData.adminEmail} 
                  onChange={(e) => setNewInstituteData({ ...newInstituteData, adminEmail: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Institute Type</label>
                  <div className="relative">
                    <select 
                      className="w-full h-12 px-4 pr-10 appearance-none bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[15px] font-medium text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                      value={newInstituteData.type} 
                      onChange={(e) => setNewInstituteData({ ...newInstituteData, type: e.target.value })}
                    >
                      <option value="jee">JEE</option>
                      <option value="neet">NEET</option>
                      <option value="ssc">SSC</option>
                    </select>
                    <RiArrowDownSLine size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B7B7B] pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Price / Student (₹)</label>
                  <input 
                    type="number" 
                    className="w-full h-12 px-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[15px] text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner" 
                    placeholder="500" 
                    min="0" 
                    value={newInstituteData.price} 
                    onChange={(e) => setNewInstituteData({ ...newInstituteData, price: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 pt-6 border-t border-s-stroke2/30">
                <button 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="h-12 px-6 rounded-lg text-[14px] font-semibold text-[#7B7B7B] bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 hover:text-[#101010] dark:hover:text-t-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  className={`h-12 px-8 rounded-lg bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 text-[14px] font-semibold hover:bg-[#202020] transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center ${isCreating ? 'opacity-70 pointer-events-none' : ''}`} 
                  onClick={handleCreateInstitute}
                  disabled={isCreating}
                >
                  {isCreating ? "Provisioning..." : "Provision Institute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
