import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";
import { notifyStudents } from "../notifications/notifications.service";

const RESOURCE_TYPES = new Set(["pdf", "link", "video", "note"]);
const RESOURCE_STATUSES = new Set(["draft", "published", "archived"]);

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

async function ownedBatches(instituteId: string, batchIds: string[]) {
  const unique = [...new Set(batchIds)];
  if (!unique.length) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabaseDB.from("batches").select("id").eq("institute_id", instituteId).eq("is_active", true).in("id", unique)
    .or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`);
  if (error) throw error;
  return data ?? [];
}

export async function createResource(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = req.user?.institute_id;
    if (!instituteId) { res.status(403).json({ success: false, message: "An institute account is required." }); return; }
    const { title, description, content, resource_type, resource_url, exam_code, subject, chapter, topic, batch_ids, status = "published" } = req.body ?? {};
    const url = safeHttpsUrl(resource_url);
    const validPayload = resource_type === "note"
      ? typeof content === "string" && content.trim().length > 0
      : Boolean(url);
    if (typeof title !== "string" || !title.trim() || !RESOURCE_TYPES.has(resource_type) || !validPayload || !Array.isArray(batch_ids) || !batch_ids.length || !RESOURCE_STATUSES.has(status)) {
      res.status(400).json({ success: false, message: "title, a note body or HTTPS resource URL, resource_type, status, and at least one batch are required." }); return;
    }
    const batches = await ownedBatches(instituteId, batch_ids);
    if (batches.length !== new Set(batch_ids).size) { res.status(403).json({ success: false, message: "One or more selected batches are outside your institute." }); return; }
    const { data: resource, error } = await supabaseDB.from("institute_resources").insert({
      institute_id: instituteId, created_by: req.user!.id, title: title.trim(), description: typeof description === "string" ? description.trim() || null : null,
      resource_type, resource_url: resource_type === "note" ? null : url, content: resource_type === "note" ? content.trim() : null, exam_code: exam_code || null, subject: subject || null, chapter: chapter || null, topic: topic || null,
      status, published_at: status === "published" ? new Date().toISOString() : null,
    }).select("*").single();
    if (error || !resource) throw error ?? new Error("Could not create resource.");
    const { error: linkError } = await supabaseDB.from("institute_resource_batches").insert(batches.map((batch: any) => ({ resource_id: resource.id, batch_id: batch.id })));
    if (linkError) { await supabaseDB.from("institute_resources").delete().eq("id", resource.id).eq("institute_id", instituteId); throw linkError; }
    if (status === "published") {
      try {
        const { data: students, error: studentError } = await supabaseDB.from("batch_students").select("student_id").in("batch_id", batches.map((batch: any) => batch.id));
        if (studentError) throw studentError;
        await notifyStudents({
          instituteId, userIds: (students ?? []).map((student: any) => student.student_id),
          type: "study_material_published", title: "New study material",
          body: title.trim(), href: "/student/tests?tab=resources", eventKey: `study_material_published:${resource.id}`,
          metadata: { resource_id: resource.id },
        });
      } catch (notificationError: any) {
        console.error("[resources] notification delivery failed:", notificationError.message);
      }
    }
    res.status(201).json({ success: true, data: { resource } });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message ?? "Could not create resource." }); }
}

export async function getStudentResources(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = req.user?.institute_id;
    if (!instituteId) { res.status(403).json({ success: false, message: "An institute account is required." }); return; }
    const { data: memberships, error: membershipError } = await supabaseDB.from("batch_students").select("batch_id").eq("student_id", req.user!.id);
    if (membershipError) throw membershipError;
    const membershipBatchIds = (memberships ?? []).map((row: any) => row.batch_id);
    const now = new Date().toISOString();
    const { data: activeBatches, error: batchError } = membershipBatchIds.length
      ? await supabaseDB.from("batches").select("id").eq("institute_id", instituteId).eq("is_active", true).in("id", membershipBatchIds)
        .or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`)
      : { data: [], error: null };
    if (batchError) throw batchError;
    const batchIds = (activeBatches ?? []).map((batch: any) => batch.id);
    if (!batchIds.length) { res.json({ success: true, data: { resources: [] } }); return; }
    const { data: links, error: linksError } = await supabaseDB.from("institute_resource_batches").select("resource_id").in("batch_id", batchIds);
    if (linksError) throw linksError;
    const resourceIds = [...new Set((links ?? []).map((row: any) => row.resource_id))];
    if (!resourceIds.length) { res.json({ success: true, data: { resources: [] } }); return; }
    const { data, error } = await supabaseDB.from("institute_resources").select("id, title, description, content, resource_type, resource_url, exam_code, subject, chapter, topic, published_at, created_at")
      .eq("institute_id", instituteId).eq("status", "published").lte("published_at", new Date().toISOString()).in("id", resourceIds).order("published_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: { resources: data ?? [] } });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message ?? "Could not load resources." }); }
}

export async function getInstituteResources(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = req.user?.institute_id;
    if (!instituteId) { res.status(403).json({ success: false, message: "An institute account is required." }); return; }
    let query = supabaseDB.from("institute_resources").select("*").eq("institute_id", instituteId).order("created_at", { ascending: false });
    if (req.user?.role === "teacher") query = query.eq("created_by", req.user.id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: { resources: data ?? [] } });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message ?? "Could not load resources." }); }
}
