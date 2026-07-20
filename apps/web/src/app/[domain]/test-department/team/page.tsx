"use client";

import { FormEvent, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

type TestAdmin = {
  user_id: string;
  title: string | null;
  users?: { name?: string; email?: string; role?: string } | Array<{ name?: string; email?: string; role?: string }>;
};

/** Institute Admin's single-purpose handoff screen for the Test Department. */
export default function TestAdminPage() {
  const { session, user } = useAuth();
  const [testAdmin, setTestAdmin] = useState<TestAdmin | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", title: "Test Admin" });
  const canAppoint = user?.role === "institute_admin";

  const load = async () => {
    if (!session?.access_token) return;
    const response: any = await apiClient.get("/api/v1/test-department/members", session.access_token);
    setTestAdmin(response.data?.members?.[0] ?? null);
  };
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, [session?.access_token]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!canAppoint || !session?.access_token) return;
    setSaving(true); setMessage("");
    try {
      await apiClient.post("/api/v1/test-department/members", form, session.access_token);
      await load();
      setMessage("Test Admin account created. A secure sign-in email was sent.");
    } catch (error: any) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const profile = Array.isArray(testAdmin?.users) ? testAdmin?.users[0] : testAdmin?.users;
  return <>
    <Navbar title="Test Department" breadcrumbs="INSTITUTE > TEST DEPARTMENT" subtitle="One Test Admin owns test preparation, review, publishing, and study material." />
    <main className="mx-auto grid w-full max-w-[1080px] gap-5 px-4 pb-12 pt-5 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold text-t-primary">Test Admin</h2>
        <p className="mt-1 text-sm text-t-secondary">Keep this operational role with one accountable owner. The Institute Admin remains responsible for people and batches.</p>
        {testAdmin ? <div className="mt-6 flex items-center justify-between gap-4 rounded-[12px] border border-s-stroke2 bg-b-surface2/50 p-4">
          <div><p className="font-semibold text-t-primary">{profile?.name ?? "Test Admin"}</p><p className="mt-1 text-sm text-t-secondary">{profile?.email}</p></div>
          <div className="rounded-full border border-primary-01/25 bg-primary-01/10 px-3 py-1 text-xs font-bold text-primary-01">TEST ADMIN</div>
        </div> : <div className="mt-6 rounded-[12px] border border-dashed border-s-stroke2 p-8 text-center"><p className="font-semibold text-t-primary">No Test Admin appointed</p><p className="mt-1 text-sm text-t-secondary">Appoint one person to prepare and publish assessments and material.</p></div>}
      </section>
      {canAppoint && !testAdmin && <form onSubmit={create} className="card h-fit p-5"><h2 className="font-semibold text-t-primary">Appoint Test Admin</h2><p className="mt-1 text-sm text-t-secondary">They will receive a secure sign-in email.</p>{message && <p className="mt-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-3 py-2 text-sm text-t-secondary">{message}</p>}<div className="mt-5 space-y-4"><Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required /><Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required /><Field label="Job title" value={form.title} onChange={(title) => setForm({ ...form, title })} /><button disabled={saving} className="h-11 w-full rounded-[10px] bg-shade-02 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Creating…" : "Create Test Admin account"}</button></div></form>}
    </main>
  </>;
}

function Field({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="block text-xs font-bold uppercase tracking-wider text-t-secondary">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary outline-none focus:border-primary-01" /></label>;
}
