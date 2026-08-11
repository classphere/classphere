import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.middleware";
import { requireRole } from "../../../middleware/rbac.middleware";
import { listStudents, importStudents, createStudent, getStudentHistory } from "./students.controller";

const router = Router();

// Store uploaded file in memory (max 5MB) — no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed"));
    }
  },
});

router.get("/", authenticate, requireRole("institute_admin", "super_admin"), listStudents);
router.post("/", authenticate, requireRole("institute_admin", "super_admin"), createStudent);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post("/import", authenticate, requireRole("institute_admin"), (upload.single("file") as any), importStudents);

// Every batch a student has passed through. batch_students has always been
// append-only; nothing read it back until now.
router.get("/:id/history", authenticate, requireRole("institute_admin", "super_admin"), getStudentHistory);

export default router;
