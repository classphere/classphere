import path from "path";

// pyqs.service.ts is at: apps/api/src/modules/pyqs/
// 5 levels up: test-jee-neet/ (project root) — where the JSON files live
export const ROOT = path.resolve(__dirname, "../../../../../");

export const PYQ_REGISTRY = [
  { id: "jee-main-2024-jan-27-shift-1", fileName: "JEE Main 2024 (27 Jan Shift 1).json" },
  { id: "jee-main-2024-jan-27-shift-2", fileName: "JEE Main 2024 (27 Jan Shift 2).json" },
  { id: "kota-major-10", fileName: "KOTA_MAJOR_-10.json" }
];
