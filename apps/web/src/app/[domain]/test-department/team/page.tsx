"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";

type TeamMember = {
  user_id: string;
  title: string | null;
  access_level?: "head" | "editor";
  users?: { name?: string; email?: string; role?: string } | Array<{ name?: string; email?: string; role?: string }>;
};

const memberProfile = (member: TeamMember) => (Array.isArray(member.users) ? member.users[0] : member.users);

/**
 * Peers, not a hierarchy — see migration 54. Three is a guard against an
 * institute turning its whole staff into publishers, not an org chart. The
 * database and the API enforce the same number; this copy exists so the form
 * disappears at the limit instead of submitting into a 409.
 */
const MAX_TEST_HEADS = 3;

/**
 * Appointing the people who run assessment.
 *
 * The department used to be two tiers — a Head who published and Editors who
 * prepared — and this screen let each of them staff the tier below. That split
 * is gone: there is one role, Test Head, every Head can do the whole job, and
 * only the Institute Admin appoints them. A Head can see who their colleagues
 * are; they cannot add or remove one, because there is no seniority between
 * them to justify it.
 */
export default function TestDepartmentTeamPage() {
  const { session, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", title: "", password: "" });

  const isInstituteAdmin = user?.role === "institute_admin";
  const isTestHead = user?.role === "test_department_head" || user?.role === "test_department_member";
  const allowed = isInstituteAdmin || isTestHead;

  const MEMBERS_PATH = "/api/v1/test-department/members";
  const { data: memberData, error: memberError } = useApiQuery<{ members: TeamMember[] }>(
    allowed ? MEMBERS_PATH : null,
  );
  const heads = memberData?.members ?? [];
  const atLimit = heads.length >= MAX_TEST_HEADS;
  const reload = () => queryClient.invalidateQueries({ queryKey: [MEMBERS_PATH] });

  useEffect(() => {
    if (!user || allowed) return;
    router.replace("/student/dashboard");
  }, [user, allowed, router]);

  useEffect(() => {
    if (memberError) setMessage(memberError.message);
  }, [memberError]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.access_token) return;
    setSaving(true);
    setMessage("");
    try {
      await apiClient.post(MEMBERS_PATH, form, session.access_token);
      setForm({ name: "", email: "", title: "", password: "" });
      await reload();
      setMessage("Test Head account created and the sign-in email sent.");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: TeamMember) => {
    const profile = memberProfile(member);
    if (!session?.access_token) return;
    if (!window.confirm(`Remove ${profile?.name ?? "this account"}? Their sign-in will be disabled, but every paper and review they touched stays on record.`)) return;
    setRemovingId(member.user_id);
    setMessage("");
    try {
      await apiClient.delete(`${MEMBERS_PATH}/${member.user_id}`, session.access_token);
      await reload();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <Navbar
        title="Test Department"
        breadcrumbs={isInstituteAdmin ? "INSTITUTE > TEST DEPARTMENT" : "TEST DEPARTMENT > TEAM"}
        subtitle={
          isInstituteAdmin
            ? `Appoint the people who prepare and publish your tests — up to ${MAX_TEST_HEADS}.`
            : "The people who prepare and publish your institute's tests."
        }
      />

      <main className="mx-auto grid w-full max-w-[1080px] gap-3 px-4 pb-12 pt-5 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-t-primary">Test Heads</h2>
              <p className="mt-1 text-sm text-t-secondary">
                Every Test Head does the whole job — upload a paper, correct it, set its duration and
                marks, assign it to batches, and publish it.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-s-stroke2 bg-b-surface2 px-3 py-1 text-xs font-bold text-t-secondary">
              {heads.length} / {MAX_TEST_HEADS}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {heads.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-s-stroke2 p-8 text-center text-sm text-t-secondary">
                {isInstituteAdmin
                  ? "No Test Head has been appointed yet. Add one to start building tests."
                  : "No Test Head has been appointed."}
              </p>
            ) : (
              heads.map((member) => {
                const profile = memberProfile(member);
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between gap-4 rounded-[12px] border border-s-stroke2 bg-b-surface2/50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-t-primary">{profile?.name ?? "Team member"}</p>
                      <p className="mt-1 truncate text-sm text-t-secondary">
                        {profile?.email}
                        {member.title ? ` · ${member.title}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full border border-primary-01/25 bg-primary-01/10 px-3 py-1 text-xs font-bold text-primary-01">
                        TEST HEAD
                      </span>
                      {isInstituteAdmin && (
                        <button
                          disabled={removingId === member.user_id}
                          onClick={() => remove(member)}
                          className="text-xs font-semibold text-primary-03 disabled:opacity-50"
                        >
                          {removingId === member.user_id ? "Removing…" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {isInstituteAdmin && (
          atLimit ? (
            <aside className="card h-fit p-5">
              <h2 className="font-semibold text-t-primary">All {MAX_TEST_HEADS} Test Heads appointed</h2>
              <p className="mt-1 text-sm text-t-secondary">
                An institute can have up to {MAX_TEST_HEADS} Test Heads at a time. Remove one above before
                appointing someone else.
              </p>
            </aside>
          ) : (
            <form onSubmit={create} className="card h-fit p-5">
              <h2 className="font-semibold text-t-primary">Add Test Head</h2>
              <p className="mt-1 text-sm text-t-secondary">A secure sign-in email will be sent to this person.</p>
              {message && (
                <p className="mt-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-3 py-2 text-sm text-t-secondary">
                  {message}
                </p>
              )}
              <div className="mt-3 space-y-4">
                <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
                <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required />
                <Field label="Job title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
                <Field
                  label="Password (optional — leave blank to auto-generate)"
                  type="password"
                  value={form.password}
                  onChange={(password) => setForm({ ...form, password })}
                />
                <button
                  disabled={saving}
                  className="h-11 w-full rounded-[10px] bg-shade-02 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Creating…" : "Add Test Head"}
                </button>
              </div>
            </form>
          )
        )}

        {!isInstituteAdmin && message && (
          <aside className="card h-fit p-5 text-sm text-t-secondary">{message}</aside>
        )}
      </main>
    </>
  );
}

function Field({
  label, value, onChange, required = false, type = "text",
}: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-t-secondary">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary outline-none focus:border-primary-01"
      />
    </label>
  );
}
