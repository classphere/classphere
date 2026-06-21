"use client";

import Navbar from "@/components/layout/Navbar";
import { Suspense, useState } from "react";
import { RiSmartphoneLine, RiComputerLine, RiGoogleFill, RiWhatsappFill, RiCheckFill, RiDownloadCloud2Line, RiErrorWarningLine } from "@remixicon/react";

function SettingsContent() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  return (
    <>
      <Navbar title="Platform Settings" subtitle="Manage your account, preferences, and test settings." breadcrumbs="Dashboard > Settings" />
      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-6 pb-10 md:px-8 xl:flex-row xl:items-start">

        {/* Left Nav Menu */}
        <div className="xl:sticky xl:top-28 xl:w-64 xl:shrink-0">
          <div className="card flex flex-row gap-2 overflow-x-auto rounded-4xl p-3 xl:flex-col xl:gap-1">
            {[
              { id: "general", label: "General Info", active: true },
              { id: "security", label: "Security", active: false },
              { id: "notifications", label: "Notifications", active: false },
              { id: "integrations", label: "Integrations", active: false },
            ].map(tab => (
              <button
                key={tab.id}
                className={`whitespace-nowrap rounded-3xl px-4 py-2.5 text-left text-caption font-semibold transition-colors ${
                  tab.active ? "bg-b-surface2 text-t-primary shadow-widget" : "text-t-secondary hover:text-t-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Form Card */}
        <div className="card min-w-0 flex-1 p-6 md:p-8">

          <h2 className="section-title mb-8">General Info</h2>

          <div className="mb-8">
            <div className="mb-3 flex size-24 items-center justify-center rounded-full bg-primary-01 text-t-light shadow-widget">
              {/* Abstract geometric icon placeholder */}
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2L2 13H10V22L19 11H11V2Z" /></svg>
            </div>
            <button className="btn btn-ghost px-0 text-primary-01">
              <RiCheckFill size={16} /> Replace
            </button>
          </div>

          <div className="mb-12 flex flex-col gap-6">
            <div>
              <label className="text-bold mb-2 block">Display Name</label>
              <input type="text" className="input" defaultValue="Harsh Singh" />
              <div className="t-body-sm mt-1.5">Shown on leaderboards and doubts.</div>
            </div>

            <div>
              <label className="text-bold mb-2 block">Bio</label>
              <textarea className="input textarea" defaultValue="JEE 2026 Aspirant focusing on Physics and Maths." />
              <div className="t-body-sm mt-1.5 text-right">48/100</div>
            </div>

            <div>
              <label className="text-bold mb-2 block">Email Address</label>
              <input type="text" className="input" defaultValue="harshsingh15dec@gmail.com" />
              <div className="t-body-sm mt-1.5">Used for login and important communications.</div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-bold mb-2 block">Target Exam</label>
                <div className="search-bar rounded-full px-4 py-2.5">
                  <input type="text" defaultValue="JEE Main" readOnly />
                </div>
              </div>
              <div>
                <label className="text-bold mb-2 block">Phone</label>
                <input type="text" className="input" defaultValue="+1 (415) 555-0199" />
              </div>
            </div>
          </div>

          <hr className="divider my-12" />

          <h2 className="section-title mb-8">Security</h2>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-s-stroke2 pb-6">
              <div>
                <div className="text-bold">Two-Factor Authentication (2FA)</div>
                <div className="t-body-sm">Requires a security key or authenticator app.</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>

            <div className="flex items-center justify-between border-b border-s-stroke2 pb-6">
              <div>
                <div className="text-bold">Active Sessions</div>
                <div className="t-body-sm flex items-center gap-2">
                  <RiComputerLine size={16} /> MacBook Pro (Current) • IP: 192.168.1.1
                </div>
              </div>
              <button className="btn btn-outline">Revoke All</button>
            </div>
          </div>

          <hr className="divider my-12" />

          <h2 className="section-title mb-8">Notifications</h2>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-s-stroke2 pb-6">
              <div>
                <div className="text-bold">Test Reminders</div>
                <div className="t-body-sm">Get notified 24 hours before a scheduled test.</div>
              </div>
              <label className="switch">
                <input type="checkbox" />
                <span className="switch-track"></span>
              </label>
            </div>
            <div className="flex items-center justify-between border-b border-s-stroke2 pb-6">
              <div>
                <div className="text-bold">Performance Reports</div>
                <div className="t-body-sm">Receive a weekly email summary of your test scores.</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
            <div className="flex items-center justify-between border-b border-s-stroke2 pb-6">
              <div>
                <div className="text-bold">Doubt Resolution</div>
                <div className="t-body-sm">Get alerts when a teacher answers your doubt.</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-12 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn btn-outline">Discard Changes</button>
            <button className="btn btn-dark min-w-36" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>

        </div>

      </main>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
