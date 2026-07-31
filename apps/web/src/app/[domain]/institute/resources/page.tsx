"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

type Batch = { id: string; name: string };
type Resource = { id: string; title: string; resource_type: string; status: string; created_at: string };

export default function InstituteResourcesPage() {
  const { session } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", content: "", resource_type: "note", resource_url: "", subject: "", chapter: "", topic: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session?.access_token) return;
    try {
      const [batchResponse, resourceResponse] = await Promise.all([
        apiClient.get("/api/v1/batches", session.access_token),
        apiClient.get("/api/v1/resources/mine", session.access_token),
      ]);
      setBatches(batchResponse.data?.batches ?? []);
      setResources(resourceResponse.data?.resources ?? []);
    } catch (error: any) { setStatus(error.message ?? "Could not load study material."); }
  };
  useEffect(() => { void load(); }, [session]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.access_token) return;
    setSaving(true); setStatus(null);
    try {
      await apiClient.post("/api/v1/resources", { ...form, batch_ids: selectedBatchIds, status: "published" }, session.access_token);
      setForm({ title: "", description: "", content: "", resource_type: "note", resource_url: "", subject: "", chapter: "", topic: "" });
      setSelectedBatchIds([]);
      setStatus("Study material published to the selected batches.");
      await load();
    } catch (error: any) { setStatus(error.message ?? "Could not publish study material."); }
    finally { setSaving(false); }
  };

  return <><Navbar title="Study Material" subtitle="Publish notes and resources to selected batches." breadcrumbs="Institute > Study Material" />
    <main className="mx-auto grid w-full max-w-screen-2xl gap-3 px-4 pb-12 md:grid-cols-[minmax(0,1fr)_22rem] md:px-8">
      <form onSubmit={publish} className="card p-5 sm:p-7"><h2 className="text-lg font-bold text-t-primary">Publish material</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required /><label className="text-sm font-semibold text-t-secondary">Type<select value={form.resource_type} onChange={(event) => setForm({ ...form, resource_type: event.target.value })} className="mt-2 h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-t-primary"><option value="note">Note</option><option value="pdf">PDF link</option><option value="link">Link</option><option value="video">Video link</option></select></label><Field label="Subject (optional)" value={form.subject} onChange={(subject) => setForm({ ...form, subject })} /><Field label="Chapter (optional)" value={form.chapter} onChange={(chapter) => setForm({ ...form, chapter })} /><Field label="Topic (optional)" value={form.topic} onChange={(topic) => setForm({ ...form, topic })} /></div>
        <label className="mt-4 block text-sm font-semibold text-t-secondary">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-20 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 p-3 text-t-primary" /></label>
        {form.resource_type === "note" ? <label className="mt-4 block text-sm font-semibold text-t-secondary">Note body<textarea required value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="mt-2 min-h-36 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 p-3 text-t-primary" /></label> : <Field label="HTTPS resource URL" value={form.resource_url} onChange={(resource_url) => setForm({ ...form, resource_url })} required />}
        <div className="mt-3"><p className="text-sm font-semibold text-t-secondary">Visible to batches</p><div className="mt-2 flex flex-wrap gap-2">{batches.map((batch) => <label key={batch.id} className="flex items-center gap-2 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 py-2 text-sm text-t-primary"><input type="checkbox" checked={selectedBatchIds.includes(batch.id)} onChange={() => setSelectedBatchIds((ids) => ids.includes(batch.id) ? ids.filter((id) => id !== batch.id) : [...ids, batch.id])} />{batch.name}</label>)}</div></div>
        {status && <p className="mt-4 text-sm text-t-secondary">{status}</p>}<button disabled={saving || !selectedBatchIds.length} className="mt-3 h-11 rounded-[10px] bg-shade-02 px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Publishing…" : "Publish material"}</button>
      </form>
      <aside className="card h-fit p-5"><h2 className="font-bold text-t-primary">Published material</h2><div className="mt-4 space-y-3">{resources.length ? resources.map((resource) => <div key={resource.id} className="rounded-[10px] border border-s-stroke2 p-3"><p className="font-semibold text-t-primary">{resource.title}</p><p className="mt-1 text-xs uppercase tracking-wide text-t-secondary">{resource.resource_type} · {resource.status}</p></div>) : <p className="text-sm text-t-secondary">Nothing published yet.</p>}</div></aside>
    </main></>;
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block text-sm font-semibold text-t-secondary">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-t-primary" /></label>;
}
