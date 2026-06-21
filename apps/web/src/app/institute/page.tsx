"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  RiTeamLine,
  RiGroupLine,
  RiBankCardLine,
  RiArrowRightUpLine,
  RiMoreFill,
  RiAddLine
} from "@remixicon/react";
import { mockInstituteAdmin, mockBatches, mockInstituteStudents, mockInstituteTests } from "../../lib/mock-data";

export default function InstituteDashboardPage() {
  return (
    <>
      <Navbar title={`${mockInstituteAdmin.instituteName} Dashboard`} subtitle={`Welcome back, ${mockInstituteAdmin.name}. Here is your institute overview.`} breadcrumbs="Dashboard" />
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">

        {/* Header Actions */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button className="btn btn-outline flex items-center gap-2">
            <RiAddLine size={18} /> Create New Batch
          </button>
          <Link href="/institute/tests/create" className="btn btn-primary flex items-center gap-2 no-underline">
            <RiAddLine size={18} /> Schedule Batch Test
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-b-surface1 p-2 text-t-primary">
                <RiGroupLine size={20} />
              </div>
              <h3 className="text-bold text-t-secondary">Total Students</h3>
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-h4 font-bold tracking-tight text-t-primary">{mockInstituteAdmin.studentsCount}</div>
              <span className="badge badge-green"><RiArrowRightUpLine size={12} /> +12 this month</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-b-surface1 p-2 text-t-primary">
                <RiTeamLine size={20} />
              </div>
              <h3 className="text-bold text-t-secondary">Active Batches</h3>
            </div>
            <div className="text-h4 font-bold tracking-tight text-t-primary">{mockInstituteAdmin.batchesCount}</div>
            <p className="t-body-sm mt-2">2 batches completing soon</p>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-b-surface1 p-2 text-t-primary">
                <RiBankCardLine size={20} />
              </div>
              <h3 className="text-bold text-t-secondary">Subscription</h3>
            </div>
            <div className="text-h6 font-bold text-primary-02">{mockInstituteAdmin.plan}</div>
            <p className="t-body-sm mt-2">Renews on Aug 15, 2026</p>
          </div>
        </div>

        {/* Collaborative Test Pipeline */}
        <section className="card mb-6 overflow-hidden p-0">
          <div className="mb-6 flex items-center justify-between gap-4 px-6 pt-6">
            <h2 className="section-title mb-0">Test Pipeline</h2>
            <Link href="/institute/tests" className="btn btn-outline btn-sm whitespace-nowrap">View All Tests</Link>
          </div>
          <table className="rayum-table">
            <thead>
              <tr>
                <th className="pl-6">Test Name</th>
                <th>Batch</th>
                <th>Date</th>
                <th>Section Status</th>
                <th className="pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockInstituteTests.map(test => (
                <tr key={test.id}>
                  <td className="pl-6 text-bold">{test.name}</td>
                  <td className="t-body-sm">{test.batch}</td>
                  <td className="t-body-sm text-bold">{new Date(test.scheduledDate).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-1.5">
                      {Object.entries(test.progress).map(([subject, status]) => (
                        <span key={subject} title={subject} className={`size-3 rounded-full ${status === "completed" ? "bg-primary-02" : "bg-primary-01"}`} />
                      ))}
                    </div>
                  </td>
                  <td className="pr-6">
                    <span className={`badge ${test.status === 'ready' ? 'badge-green' : 'badge-orange'}`}>
                      {test.status === 'ready' ? 'Ready to Publish' : 'Waiting on Teachers'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">

          {/* Batches Overview */}
          <section className="card overflow-hidden p-0">
            <div className="mb-6 flex items-center justify-between gap-4 px-6 pt-6">
              <h2 className="section-title mb-0">Recent Batches</h2>
              <Link href="/institute/batches" className="btn btn-outline btn-sm whitespace-nowrap">View All</Link>
            </div>
            <table className="rayum-table">
              <thead>
                <tr>
                  <th className="pl-6">Batch Name</th>
                  <th>Students</th>
                  <th>Avg Score</th>
                  <th className="pr-6"></th>
                </tr>
              </thead>
              <tbody>
                {mockBatches.map(batch => (
                  <tr key={batch.id}>
                    <td className="pl-6">
                      <div className="text-bold">{batch.name}</div>
                      <div className="t-body-sm">{batch.exam}</div>
                    </td>
                    <td className="t-body-sm text-bold">{batch.studentsCount}</td>
                    <td className="text-bold">{batch.avgScore}%</td>
                    <td className="pr-6 text-right">
                      <button className="btn btn-ghost p-1.5">
                        <RiMoreFill size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Top Students */}
          <section className="card p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="section-title mb-0">Top Performing Students</h2>
              <Link href="/institute/students" className="btn btn-outline btn-sm whitespace-nowrap">View Directory</Link>
            </div>
            <div className="flex flex-col gap-4">
              {mockInstituteStudents.slice(0, 5).map((student, index) => (
                <div key={student.id} className="flex items-center justify-between rounded-3xl bg-b-surface2 p-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary-02 text-sm font-bold text-t-light">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-body-2 font-bold text-t-primary">{student.name}</div>
                      <div className="t-body-sm">{student.batch}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-h6 font-bold text-primary-02">{student.avgScore}%</div>
                    <div className="t-body-sm">Avg Score</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
