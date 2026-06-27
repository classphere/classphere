"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { RiBuilding4Line, RiMore2Fill, RiSearchLine, RiFilter3Line, RiArrowDownSLine, RiCloseLine } from "@remixicon/react";

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
    type: "jee-neet",
    price: 50,
  });

  return (
    <>
      <Navbar title="Institutes CRM" subtitle="Manage your partner database and enterprise clients." />
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">
        
        {/* KPI Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-6">
            <div className="t-label mb-3">Total Institutes</div>
            <div className="text-h4 font-bold tracking-tight text-t-primary">42</div>
          </div>
          <div className="card p-6">
            <div className="t-label mb-3">Active Students</div>
            <div className="text-h4 font-bold tracking-tight text-t-primary">72.3K</div>
          </div>
          <div className="card p-6">
            <div className="t-label mb-3">Enterprise Plans</div>
            <div className="text-h4 font-bold tracking-tight text-primary-02">18</div>
          </div>
          <div className="card p-6">
            <div className="t-label mb-3">MRR</div>
            <div className="text-h4 font-bold tracking-tight text-primary-01">$124K</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card overflow-hidden p-0">
          
          {/* Table Header Controls */}
          <div className="mb-6 flex flex-col gap-4 px-6 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="search-bar w-full max-w-md">
              <RiSearchLine size={18} />
              <input type="text" placeholder="Search" />
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-outline flex items-center gap-2">
                Filter by <RiFilter3Line size={16} />
              </button>
              <button className="btn btn-outline flex items-center gap-2">
                Sort by <RiFilter3Line size={16} />
              </button>
              <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-outline flex items-center gap-2">
                <RiBuilding4Line size={16} /> New
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="rayum-table">
              <thead>
                <tr>
                  <th className="pl-6">Institute</th>
                  <th>Location</th>
                  <th>Students</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th className="pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockInstitutes.map(institute => (
                  <tr key={institute.id}>
                    <td className="pl-6">
                      <div className="flex items-center gap-4">
                        <div className="avatar avatar-md bg-b-surface1 text-t-secondary">
                          {institute.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-bold">{institute.name}</div>
                          <div className="t-body-sm">{institute.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="t-body-sm">{institute.location}</td>
                    <td className="t-body-sm text-bold">{institute.students.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${institute.plan === "Enterprise" ? "badge-blue" : institute.plan === "Pro" ? "badge-gray" : "badge-orange"}`}>
                        {institute.plan}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${institute.status === "Active" ? "badge-green" : "badge-red"}`}>
                        {institute.status}
                      </span>
                    </td>
                    <td className="pr-6 text-right">
                      <button className="btn btn-ghost p-1.5">
                        <RiMore2Fill size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-s-stroke2 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="t-body-sm">
              <span className="text-bold">8</span> institutes selected
            </div>
            <div className="pagination flex-wrap">
              <button className="page-btn page-btn-arrow">&lt;</button>
              <button className="page-btn">1</button>
              <button className="page-btn active">2</button>
              <button className="page-btn">3</button>
              <span className="mx-2 text-t-secondary">...</span>
              <button className="page-btn">10</button>
              <button className="page-btn page-btn-arrow">&gt;</button>
              <div className="t-body-sm mx-4">10-20 of 200 items</div>
              <div className="search-bar px-3 py-1.5">
                <span>Items per page: 10</span> <RiArrowDownSLine size={16} />
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* New Institute Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-b-surface1 p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-t-primary">Onboard New Institute</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="rounded-full p-2 hover:bg-b-surface2 text-t-secondary transition-colors">
                <RiCloseLine size={24} />
              </button>
            </div>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Institute Name</label>
                <input type="text" className="input-field w-full" placeholder="e.g., Allen Career Institute" value={newInstituteData.name} onChange={(e) => setNewInstituteData({ ...newInstituteData, name: e.target.value })} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Admin Email</label>
                <input type="email" className="input-field w-full" placeholder="admin@institute.com" value={newInstituteData.adminEmail} onChange={(e) => setNewInstituteData({ ...newInstituteData, adminEmail: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Institute Type</label>
                  <div className="relative">
                    <select className="input-field w-full appearance-none pr-10" value={newInstituteData.type} onChange={(e) => setNewInstituteData({ ...newInstituteData, type: e.target.value })}>
                      <option value="jee-neet">JEE / NEET</option>
                      <option value="ssc">SSC / Bank PO</option>
                      <option value="hybrid">Hybrid (All)</option>
                    </select>
                    <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Price per Student (₹)</label>
                  <input type="number" className="input-field w-full" placeholder="50" min="0" value={newInstituteData.price} onChange={(e) => setNewInstituteData({ ...newInstituteData, price: Number(e.target.value) })} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-s-stroke2/50">
                <button onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost px-5">Cancel</button>
                <button className="btn btn-primary px-6 shadow-md" onClick={() => {
                  console.log("Creating institute:", newInstituteData);
                  setIsCreateModalOpen(false);
                }}>
                  Provision Institute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
