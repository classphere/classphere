/**
 * Canonical, chapter-level exam catalog.
 *
 * This is deliberately versioned in source rather than inferred from the
 * question bank.  A question bank can be incomplete; the official syllabus
 * defines the preparation surface used by readiness and coverage reporting.
 * Detailed topic wording remains in the linked official publications.
 */
export type CanonicalChapter = {
  subject: "Physics" | "Chemistry" | "Mathematics" | "Biology";
  name: string;
  aliases?: string[];
};

export type CanonicalSyllabus = {
  examCode: "jee-main" | "jee-advanced" | "neet-ug";
  label: string;
  version: string;
  sourceUrl: string;
  sourcePageLimit?: number;
  chapters: CanonicalChapter[];
};

const chapters = (
  subject: CanonicalChapter["subject"],
  names: Array<string | [string, ...string[]]>,
): CanonicalChapter[] => names.map((entry) => {
  const [name, ...aliases] = typeof entry === "string" ? [entry] : entry;
  return { subject, name, ...(aliases.length ? { aliases } : {}) };
});

const jeeMain: CanonicalSyllabus = {
  examCode: "jee-main",
  label: "JEE Main Paper 1",
  version: "2026",
  sourceUrl: "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/10/202510311323551056.pdf",
  // The product scope intentionally stops at page 11 of the supplied PDF.
  sourcePageLimit: 11,
  chapters: [
    ...chapters("Mathematics", [
      "Sets, Relations and Functions", "Complex Numbers and Quadratic Equations", "Matrices and Determinants",
      "Permutations and Combinations", "Binomial Theorem and Its Simple Applications", "Sequence and Series",
      ["Limit, Continuity and Differentiability", "Limits, Continuity and Differentiability"], "Integral Calculus",
      "Differential Equations", "Coordinate Geometry", "Three Dimensional Geometry", "Vector Algebra",
      "Statistics and Probability", "Trigonometry",
    ]),
    ...chapters("Physics", [
      "Physics and Measurement", "Kinematics", "Laws of Motion", "Work, Energy and Power", "Rotational Motion",
      "Gravitation", "Properties of Solids and Liquids", "Thermodynamics", "Kinetic Theory of Gases",
      "Oscillations and Waves", "Electrostatics", "Current Electricity", "Magnetic Effects of Current and Magnetism",
      "Electromagnetic Induction and Alternating Currents", "Electromagnetic Waves", "Optics", "Dual Nature of Matter and Radiation",
      "Atoms and Nuclei", "Electronic Devices", "Experimental Skills",
    ]),
    ...chapters("Chemistry", [
      "Some Basic Concepts in Chemistry", "Atomic Structure", "Chemical Bonding and Molecular Structure",
      "Chemical Thermodynamics", "Solutions", "Equilibrium", "Redox Reactions and Electrochemistry", "Chemical Kinetics",
      "Classification of Elements and Periodicity in Properties", "p-Block Elements", "d- and f-Block Elements",
      "Coordination Compounds", "Purification and Characterisation of Organic Compounds", "Some Basic Principles of Organic Chemistry",
      "Hydrocarbons", "Organic Compounds Containing Halogens", "Organic Compounds Containing Oxygen",
      "Organic Compounds Containing Nitrogen", "Biomolecules", "Principles Related to Practical Chemistry",
    ]),
  ],
};

const jeeAdvanced: CanonicalSyllabus = {
  examCode: "jee-advanced",
  label: "JEE Advanced",
  version: "2026",
  sourceUrl: "https://jeeadv.ac.in/documents/jee-advanced-2026-syllabus.pdf",
  chapters: [
    ...chapters("Chemistry", [
      "General Chemistry", "Atomic Structure", "Chemical Bonding and Molecular Structure", "Chemical Thermodynamics",
      "Chemical and Ionic Equilibrium", "Electrochemistry", "Chemical Kinetics", "Solid State", "Solutions", "Surface Chemistry",
      "Classification of Elements and Periodicity in Properties", "Hydrogen", "s-Block Elements", "p-Block Elements",
      "d-Block Elements", "f-Block Elements", "Coordination Compounds", "Isolation of Metals", "Principles of Qualitative Analysis",
      "Environmental Chemistry", "Basic Principles of Organic Chemistry", "Alkanes", "Alkenes and Alkynes", "Benzene", "Phenols",
      "Alkyl Halides", "Alcohols", "Ethers", "Aldehydes and Ketones", "Carboxylic Acids", "Amines", "Haloarenes",
      "Biomolecules", "Polymers", "Chemistry in Everyday Life", "Practical Organic Chemistry",
    ]),
    ...chapters("Mathematics", [
      "Sets, Relations and Functions", "Algebra", "Matrices", "Probability and Statistics", "Trigonometry", "Analytical Geometry",
      "Differential Calculus", "Integral Calculus", "Vectors",
    ]),
    ...chapters("Physics", [
      "General Physics", "Mechanics", "Thermal Physics", "Electricity and Magnetism", "Electromagnetic Waves", "Optics", "Modern Physics",
    ]),
  ],
};

const neet: CanonicalSyllabus = {
  examCode: "neet-ug",
  label: "NEET UG",
  version: "2025",
  sourceUrl: "https://nta.ac.in/Download/Notice/Notice_20241230193629.pdf",
  chapters: [
    ...chapters("Physics", [
      "Physics and Measurement", "Kinematics", "Laws of Motion", "Work, Energy and Power", "Rotational Motion", "Gravitation",
      "Properties of Bulk Matter", "Thermodynamics", "Behaviour of Perfect Gas and Kinetic Theory", "Oscillations and Waves",
      "Electrostatics", "Current Electricity", "Magnetic Effects of Current and Magnetism", "Electromagnetic Induction and Alternating Currents",
      "Electromagnetic Waves", "Optics", "Dual Nature of Matter and Radiation", "Atoms and Nuclei", "Electronic Devices", "Experimental Skills",
    ]),
    ...chapters("Chemistry", [
      "Some Basic Concepts in Chemistry", "Atomic Structure", "Chemical Bonding and Molecular Structure", "Chemical Thermodynamics",
      "Solutions", "Equilibrium", "Redox Reactions and Electrochemistry", "Chemical Kinetics",
      "Classification of Elements and Periodicity in Properties", "p-Block Elements", "d- and f-Block Elements", "Coordination Compounds",
      "Purification and Characterisation of Organic Compounds", "Some Basic Principles of Organic Chemistry", "Hydrocarbons",
      "Organic Compounds Containing Halogens", "Organic Compounds Containing Oxygen", "Organic Compounds Containing Nitrogen", "Biomolecules",
      "Principles Related to Practical Chemistry",
    ]),
    ...chapters("Biology", [
      "Diversity in Living World", "Structural Organisation in Animals and Plants", "Cell Structure and Function", "Plant Physiology",
      "Human Physiology", "Reproduction", "Genetics and Evolution", "Biology and Human Welfare", "Biotechnology and Its Applications",
      "Ecology and Environment",
    ]),
  ],
};

export const CANONICAL_SYLLABI: Record<CanonicalSyllabus["examCode"], CanonicalSyllabus> = {
  "jee-main": jeeMain,
  "jee-advanced": jeeAdvanced,
  "neet-ug": neet,
};

export function normaliseExamCode(value?: string | null): CanonicalSyllabus["examCode"] {
  const code = (value ?? "").trim().toLowerCase();
  if (code === "neet" || code === "neet-omr" || code === "neet-ug") return "neet-ug";
  if (code === "jee-advanced" || code === "jee advanced") return "jee-advanced";
  return "jee-main";
}

export function normaliseSubject(value?: string | null): CanonicalChapter["subject"] | "Other" {
  const subject = (value ?? "").trim().toLowerCase();
  if (subject === "botany" || subject === "zoology" || subject === "biology") return "Biology";
  if (subject === "physics") return "Physics";
  if (subject === "chemistry") return "Chemistry";
  if (subject === "mathematics" || subject === "maths" || subject === "math") return "Mathematics";
  return "Other";
}

const fingerprint = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Resolves a legacy question-bank chapter to its official catalog chapter. */
export function findCanonicalChapter(examCode: string | null | undefined, subject: string, chapter: string): CanonicalChapter | undefined {
  const syllabus = CANONICAL_SYLLABI[normaliseExamCode(examCode)];
  const canonicalSubject = normaliseSubject(subject);
  const target = fingerprint(chapter);
  return syllabus.chapters.find((item) => item.subject === canonicalSubject && [item.name, ...(item.aliases ?? [])]
    .some((candidate) => fingerprint(candidate) === target));
}
