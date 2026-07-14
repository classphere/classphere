"use client";

import Navbar from "@/components/layout/Navbar";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RiCheckFill, RiCloseLine } from "@remixicon/react";

function ProfileContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";
  const { user } = useAuth();

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

  // Data from authenticated user (not hardcoded)
  const data = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    exam: user?.exam_target ?? user?.batch ?? "",
    phone: user?.phone ?? "",
    bio: "",
  };

  return (
    <>
      <Navbar title="My Profile" subtitle="Manage your profile, account security, and notification preferences" breadcrumbs="Dashboard > My Profile" />
      
      <main className="w-full max-w-[1200px] mx-auto px-8 pb-12 flex gap-8 items-start">
        
        {/* Left Nav Menu */}
        <div className="w-[220px] shrink-0 sticky top-24">
          <div className="flex flex-col gap-1">
            {[
              { id: "profile", label: "Profile information", active: true },
              { id: "account", label: "Account", active: false },
              { id: "notifications", label: "Notifications", active: false },
            ].map(tab => (
              <button
                key={tab.id}
                className={`text-left px-4 py-2.5 rounded-[10px] text-caption font-semibold border-none cursor-pointer transition-all ${
                  tab.active
                    ? "bg-b-surface1 text-t-primary shadow-widget font-bold"
                    : "bg-transparent text-t-secondary hover:text-t-primary hover:bg-b-surface1/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Form Card */}
        <div className="card flex-1 p-8 border border-s-stroke2 bg-b-surface1">
          
          <h2 className="text-sub-title-1 font-bold text-t-primary mb-6">Profile information</h2>
          
          <div className="mb-8">
            <div className="size-24 rounded-full border border-s-stroke2 overflow-hidden mb-3">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=3765F6&color=fff&size=100`}
                alt="Avatar"
                className="size-full object-cover"
              />
            </div>
            <button className="btn btn-sm btn-outline flex items-center gap-1">
              <RiCheckFill size={14} /> Replace
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">First name</label>
                <input type="text" className="input" defaultValue={data.name.split(" ")[0]} />
              </div>
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">Last name</label>
                <input type="text" className="input" defaultValue={data.name.split(" ")[1]} />
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-t-secondary mb-2">Work email</label>
              <input type="text" className="input" defaultValue={data.email} />
            </div>

            <div>
              <label className="block text-caption font-bold text-t-secondary mb-2">Target Exam</label>
              <input type="text" className="input" defaultValue={data.exam} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">Role</label>
                <input type="text" className="input bg-b-surface2 text-t-secondary font-bold" defaultValue={role.toUpperCase()} readOnly />
              </div>
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">Phone number</label>
                <input type="text" className="input" defaultValue={data.phone} />
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-t-secondary mb-2">Bio</label>
              <textarea className="input min-h-[80px] py-3" defaultValue={data.bio} />
              <div className="flex justify-between text-caption text-t-secondary mt-1 font-semibold">
                <span>Keep it short—your goals and focus.</span>
                <span>48/100</span>
              </div>
            </div>
          </div>

          <div className="border-b border-s-stroke2 my-8" />

          <h2 className="text-sub-title-1 font-bold text-t-primary mb-6">Account Settings</h2>

          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-caption font-bold text-t-secondary mb-2">Current password</label>
              <input type="password" className="input" defaultValue="password123456" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">New password</label>
                <input type="password" className="input" placeholder="Please enter your password" />
              </div>
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">Confirm new password</label>
                <input type="password" className="input" placeholder="Please enter your password" />
              </div>
            </div>
          </div>

          <div className="border-b border-s-stroke2 my-8" />

          <h2 className="text-sub-title-1 font-bold text-t-primary mb-6">Notifications</h2>

          <div className="flex flex-col">
            {[
              { title: "Test Reminders", desc: "Get notified 24 hours before a scheduled test" },
              { title: "Performance Reports", desc: "Receive a weekly email summary of your test scores" },
              { title: "Doubt Resolution", desc: "Get alerts when a teacher answers your doubt" },
              { title: "System Messages", desc: "Important updates about system status or maintenance", disabled: true },
            ].map((n, idx) => (
              <div key={idx} className="flex justify-between items-center py-4 border-b border-s-stroke2 last:border-0 last:pb-0">
                <div className="pr-4">
                  <div className="text-body-2 font-bold text-t-primary">{n.title}</div>
                  <div className="text-caption text-t-secondary mt-0.5">{n.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input type="checkbox" defaultChecked={!n.disabled} className="sr-only peer" />
                  <div className="w-11 h-6 bg-b-surface2 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-01/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-02"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-s-stroke2">
            <button className="btn btn-outline">Discard Changes</button>
            <button className="btn btn-primary min-w-[140px]" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>

        </div>

      </main>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
