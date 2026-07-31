"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

type TeamMember = { user_id: string; title: string | null; access_level?: "head" | "editor"; users?: { name?: string; email?: string; role?: string } | Array<{ name?: string; email?: string; role?: string }> };
const memberProfile = (member: TeamMember) => Array.isArray(member.users) ? member.users[0] : member.users;

export default function TestDepartmentTeamPage() {
  const { session, user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const isInstituteAdmin = user?.role === "institute_admin";
  const isHead = user?.role === "test_department_head";
  const [form, setForm] = useState({ name: "", email: "", title: "", password: "", access_level: isInstituteAdmin ? "head" : "editor" });

  const load = async () => {
    if (!session?.access_token) return;
    const response: any = await apiClient.get("/api/v1/test-department/members", session.access_token);
    setMembers(response.data?.members ?? []);
  };
  useEffect(() => {
    if (!user) return;
    if (!isInstituteAdmin && !isHead) { router.replace(user?.role === "test_department_member" ? "/test-department" : "/student/dashboard"); return; }
    void load().catch((error) => setMessage(error.message));
  }, [user, session?.access_token]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); if (!session?.access_token) return;
    setSaving(true); setMessage("");
    try {
      await apiClient.post("/api/v1/test-department/members", form, session.access_token);
      setForm({ name: "", email: "", title: "", password: "", access_level: isInstituteAdmin ? "head" : "editor" });
      await load(); setMessage(`${isHead ? "Test Editor" : "Test Department Head"} account created and invitation sent.`);
    } catch (error: any) { setMessage(error.message); } finally { setSaving(false); }
  };
  const remove = async (member: TeamMember) => {
    const profile = memberProfile(member);
    if (!session?.access_token || !window.confirm(`Remove ${profile?.name ?? "this account"}? Their sign-in will be disabled, but review history remains.`)) return;
    setRemovingId(member.user_id); setMessage("");
    try { await apiClient.delete(`/api/v1/test-department/members/${member.user_id}`, session.access_token); await load(); }
    catch (error: any) { setMessage(error.message); } finally { setRemovingId(null); }
  };

  const head = members.find((member) => member.access_level === "head" || memberProfile(member)?.role === "test_department_head");
  const canAdd = isHead || (isInstituteAdmin && !head);
  const roleLabel = isHead ? "Test Editor" : "Test Department Head";
  return <>
    <Navbar title="Test Department" breadcrumbs={isHead ? "TEST DEPARTMENT > TEAM" : "INSTITUTE > TEST DEPARTMENT"} subtitle={isHead ? "Manage the editors who prepare and review assessments." : "Appoint the accountable Head for assessment operations."} />
    <main className="mx-auto grid w-full max-w-[1080px] gap-3 px-4 pb-12 pt-5 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
      <section className="card p-5 sm:p-6"><h2 className="font-semibold text-t-primary">Assessment team</h2><p className="mt-1 text-sm text-t-secondary">Editors upload, correct, and review. Only the Department Head can publish or archive.</p>
        <div className="mt-3 space-y-3">{members.length === 0 ? <p className="rounded-[12px] border border-dashed border-s-stroke2 p-8 text-center text-sm text-t-secondary">No Test Department Head has been appointed.</p> : members.map((member) => { const profile = memberProfile(member); const isMemberHead = member.access_level === "head" || profile?.role === "test_department_head"; const canRemove = isInstituteAdmin || (isHead && !isMemberHead); return <div key={member.user_id} className="flex items-center justify-between gap-4 rounded-[12px] border border-s-stroke2 bg-b-surface2/50 p-4"><div><p className="font-semibold text-t-primary">{profile?.name ?? "Team member"}</p><p className="mt-1 text-sm text-t-secondary">{profile?.email}{member.title ? ` · ${member.title}` : ""}</p></div><div className="flex items-center gap-3"><span className="rounded-full border border-primary-01/25 bg-primary-01/10 px-3 py-1 text-xs font-bold text-primary-01">{isMemberHead ? "HEAD" : "EDITOR"}</span>{canRemove && <button disabled={removingId === member.user_id} onClick={() => remove(member)} className="text-xs font-semibold text-primary-03 disabled:opacity-50">{removingId === member.user_id ? "Removing…" : "Remove"}</button>}</div></div>; })}</div>
      </section>
      {canAdd && <form onSubmit={create} className="card h-fit p-5"><h2 className="font-semibold text-t-primary">Add {roleLabel}</h2><p className="mt-1 text-sm text-t-secondary">A secure sign-in email will be sent to this person.</p>{message && <p className="mt-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-3 py-2 text-sm text-t-secondary">{message}</p>}<div className="mt-3 space-y-4"><Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required /><Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required /><Field label="Job title" value={form.title} onChange={(title) => setForm({ ...form, title })} /><Field label="Password (optional — leave blank to auto-generate)" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} /><button disabled={saving} className="h-11 w-full rounded-[10px] bg-shade-02 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Creating…" : `Add ${roleLabel}`}</button></div></form>}
    </main>
  </>;
}
function Field({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="block text-xs font-bold uppercase tracking-wider text-t-secondary">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary outline-none focus:border-primary-01" /></label>;
}
