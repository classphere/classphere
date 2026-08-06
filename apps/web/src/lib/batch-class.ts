/**
 * What class a cohort is in right now.
 *
 * The stored value is the class they joined in, because that is the only part
 * that does not change: a class 11 cohort is class 12 a year later, and
 * storing "class 11" as a fixed attribute meant the batch still claimed class
 * 11 in its second year.
 *
 * The exam year is the anchor. An Indian session runs April to March, so a
 * cohort sitting the 2028 exam is two sessions out in 2026-27 (class 11) and
 * one session out in 2027-28 (class 12).
 */
export type ClassLevel = "class_11" | "class_12" | "dropper";

export const CLASS_LABELS: Record<ClassLevel, string> = {
  class_11: "Class 11",
  class_12: "Class 12",
  dropper: "Dropper",
};

/** The session year in progress. April starts a new one. */
export function currentSessionYear(now: Date = new Date()): number {
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export function currentClassLevel(
  entry: ClassLevel | null | undefined,
  targetYear: number | null | undefined,
  now: Date = new Date(),
): ClassLevel | null {
  if (!entry) return null;
  // A dropper is a dropper for the whole of their single year — there is no
  // class above 12 to advance into.
  if (entry === "dropper" || entry === "class_12") return entry;
  if (!targetYear) return entry;

  const sessionsOut = targetYear - currentSessionYear(now);
  return sessionsOut >= 2 ? "class_11" : "class_12";
}

/** e.g. "Class 12 · JEE Main 2028" — what the cohort is today and what it is aiming at. */
export function cohortLabel(
  entry: ClassLevel | null | undefined,
  targetYear: number | null | undefined,
  now: Date = new Date(),
): string | null {
  const level = currentClassLevel(entry, targetYear, now);
  return level ? CLASS_LABELS[level] : null;
}
